import {
  HAND_SIZE,
  HUMAN_PLAYER_ID,
  type Card,
  type CardDTO,
  type CreateGameDTO,
  type DomainEvent,
  type GameCommand,
  type GameState,
  type GameViewDTO,
  type LegalMoveDTO,
  type WorkflowResult,
} from "../core/types"
import type { EngineContainer } from "../core/container"
import { fail } from "../core/errors/game-error"
import { toCardDTO } from "../core/factories/card-factory"
import { toGameViewDTO } from "../core/mappers/game-view-mapper"

export function startGameWorkflow(
  input: CreateGameDTO,
  container: EngineContainer,
): WorkflowResult<GameState, GameViewDTO> {
  const deckCards = container.deck.create(true)
  const trump = container.deck.peekTrump(deckCards)

  if (!trump) {
    return fail("ILLEGAL_MOVE", "Cannot start game with empty deck")
  }

  let deck = deckCards.slice(0, -1)
  const players = input.players.map((player) => ({
    id: player.id,
    name: player.name,
    hand: [] as Card[],
    isBot: player.isBot ?? false,
  }))

  const deals: { playerId: string; card: CardDTO }[] = []
  const dealOrder = [1, 0] as const

  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of dealOrder) {
      const drawResult = container.deck.draw(deck, 1)
      deck = drawResult.deck
      const card = drawResult.cards[0]
      if (card) {
        players[p]!.hand = container.hand.addCards(players[p]!.hand, [card])
        deals.push({ playerId: players[p]!.id, card: toCardDTO(card) })
      }
    }
  }

  const attackerIndex = container.turn.determineFirstAttacker(players, trump)
  const defenderIndex = attackerIndex === 0 ? 1 : 0
  const attacker = players[attackerIndex]!

  const state: GameState = {
    players,
    deck,
    trump,
    discard: [],
    table: [],
    phase: "attack",
    attackerIndex,
    defenderIndex,
    currentPlayerId: attacker.id,
    winnerId: null,
    loserId: null,
  }

  const legalMoves = getLegalMoves(state, container)
  const view = toGameViewDTO(state, players[0]!.id, legalMoves)

  const events: DomainEvent[] = [
    { type: "game.started", payload: { gameId: "local" } },
    { type: "cards.dealt", payload: { deals } },
  ]

  return { ok: true, state, view, events }
}

export function executeCommandWorkflow(
  state: GameState,
  command: GameCommand,
  playerId: string,
  container: EngineContainer,
  viewerId: string = HUMAN_PLAYER_ID,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase === "finished") {
    return fail("GAME_FINISHED", "Game is already finished")
  }

  if (state.currentPlayerId !== playerId) {
    return fail("NOT_YOUR_TURN", "Not your turn")
  }

  switch (command.type) {
    case "attack":
      return applyAttack(state, command.cardId, playerId, container, viewerId)
    case "defend":
      return applyDefend(
        state,
        command.cardId,
        command.pairIndex,
        playerId,
        container,
        viewerId,
      )
    case "throw_in":
      return applyThrowIn(state, command.cardIds, playerId, container, viewerId)
    case "take":
      return applyTake(state, playerId, container, viewerId)
    case "pass":
      return applyPass(state, playerId, container, viewerId)
  }
}

function applyAttack(
  state: GameState,
  cardId: string,
  playerId: string,
  container: EngineContainer,
  viewerId: string,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase !== "attack") {
    return fail("INVALID_PHASE", "Can only attack during attack phase")
  }

  const player = container.turn.getPlayerById(state, playerId)
  if (!player) return fail("ILLEGAL_MOVE", "Player not found")

  const removed = container.hand.removeCard(player.hand, cardId)
  if (!removed) return fail("CARD_NOT_IN_HAND", "Card not in hand")

  if (!container.table.isEmpty(state.table)) {
    return fail("ILLEGAL_MOVE", "Table must be empty for initial attack")
  }

  let nextState = container.turn.updatePlayerHand(state, playerId, removed.hand)
  nextState = {
    ...nextState,
    table: container.table.addAttack(nextState.table, removed.card),
    phase: "defend",
    currentPlayerId: container.turn.getDefender(nextState).id,
  }

  const events: DomainEvent[] = [
    { type: "card.played", payload: { playerId, card: toCardDTO(removed.card) } },
  ]

  nextState = checkGameEnd(nextState)
  return buildResult(nextState, container, viewerId, events)
}

function applyThrowIn(
  state: GameState,
  cardIds: string[],
  playerId: string,
  container: EngineContainer,
  viewerId: string,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase !== "throw_in") {
    return fail("INVALID_PHASE", "Can only throw in during throw_in phase")
  }

  if (cardIds.length === 0) {
    return fail("ILLEGAL_MOVE", "No cards selected")
  }

  if (new Set(cardIds).size !== cardIds.length) {
    return fail("ILLEGAL_MOVE", "Duplicate cards in throw in")
  }

  const attacker = container.turn.getAttacker(state)
  if (attacker.id !== playerId) {
    return fail("NOT_YOUR_TURN", "Only attacker can throw in")
  }

  if (!container.table.allDefended(state.table)) {
    return fail("ILLEGAL_MOVE", "All pairs must be defended before throwing in")
  }

  let hand = attacker.hand
  let table = state.table
  const events: DomainEvent[] = []

  for (const cardId of cardIds) {
    if (!container.rules.canAddToTable({ ...state, table })) {
      return fail("ILLEGAL_MOVE", "Table is full")
    }

    const removed = container.hand.removeCard(hand, cardId)
    if (!removed) return fail("CARD_NOT_IN_HAND", "Card not in hand")

    if (!container.rules.canThrowIn(removed.card, table)) {
      return fail("ILLEGAL_MOVE", "Card rank must match a card on the table")
    }

    table = container.table.addAttack(table, removed.card)
    hand = removed.hand
    events.push({
      type: "card.played",
      payload: { playerId, card: toCardDTO(removed.card) },
    })
  }

  let nextState = container.turn.updatePlayerHand(state, playerId, hand)
  nextState = {
    ...nextState,
    table,
    phase: "defend",
    currentPlayerId: container.turn.getDefender(nextState).id,
  }

  nextState = checkGameEnd(nextState)
  return buildResult(nextState, container, viewerId, events)
}

function applyDefend(
  state: GameState,
  cardId: string,
  pairIndex: number,
  playerId: string,
  container: EngineContainer,
  viewerId: string,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase !== "defend") {
    return fail("INVALID_PHASE", "Can only defend during defend phase")
  }

  const defender = container.turn.getDefender(state)
  if (defender.id !== playerId) {
    return fail("NOT_YOUR_TURN", "Only defender can defend")
  }

  const pair = state.table[pairIndex]
  if (!pair) return fail("PAIR_NOT_FOUND", "Pair not found")
  if (pair.defense !== null) return fail("PAIR_ALREADY_DEFENDED", "Pair already defended")

  const removed = container.hand.removeCard(defender.hand, cardId)
  if (!removed) return fail("CARD_NOT_IN_HAND", "Card not in hand")

  if (!container.rules.canBeat(pair.attack, removed.card, state.trump.suit)) {
    return fail("ILLEGAL_MOVE", "Card cannot beat attack card")
  }

  const updatedTable = container.table.setDefense(state.table, pairIndex, removed.card)
  if (!updatedTable) return fail("ILLEGAL_MOVE", "Cannot set defense on pair")

  let nextState = container.turn.updatePlayerHand(state, playerId, removed.hand)
  nextState = { ...nextState, table: updatedTable }

  const events: DomainEvent[] = [
    {
      type: "card.defended",
      payload: { playerId, card: toCardDTO(removed.card), pairIndex },
    },
  ]

  if (container.table.allDefended(nextState.table)) {
    nextState = {
      ...nextState,
      phase: "throw_in",
      currentPlayerId: container.turn.getAttacker(nextState).id,
    }
  }

  nextState = checkGameEnd(nextState)
  return buildResult(nextState, container, viewerId, events)
}

function applyTake(
  state: GameState,
  playerId: string,
  container: EngineContainer,
  viewerId: string,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase !== "defend") {
    return fail("INVALID_PHASE", "Can only take during defend phase")
  }

  const defender = container.turn.getDefender(state)
  if (defender.id !== playerId) {
    return fail("NOT_YOUR_TURN", "Only defender can take cards")
  }

  const takenCards = container.table.collectCards(state.table)
  const newHand = container.hand.addCards(defender.hand, takenCards)

  let nextState = container.turn.updatePlayerHand(state, playerId, newHand)
  nextState = {
    ...nextState,
    table: [],
    phase: "attack",
    currentPlayerId: container.turn.getAttacker(nextState).id,
  }

  const events: DomainEvent[] = [
    { type: "cards.taken", payload: { playerId, count: takenCards.length } },
  ]

  const { state: refilledState, deals } = refillHands(nextState, container)
  nextState = refilledState

  if (deals.length > 0) {
    events.push({
      type: "cards.dealt",
      payload: {
        deals: deals.map((deal) => ({
          playerId: deal.playerId,
          card: toCardDTO(deal.card),
        })),
      },
    })
  }

  nextState = checkGameEnd(nextState)

  return buildResult(nextState, container, viewerId, events)
}

function applyPass(
  state: GameState,
  playerId: string,
  container: EngineContainer,
  viewerId: string,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase !== "throw_in") {
    return fail("INVALID_PHASE", "Can only pass during throw_in phase")
  }

  const attacker = container.turn.getAttacker(state)
  if (attacker.id !== playerId) {
    return fail("NOT_YOUR_TURN", "Only attacker can pass")
  }

  if (!container.table.allDefended(state.table)) {
    return fail("ILLEGAL_MOVE", "All pairs must be defended before passing")
  }

  const tableCards = container.table.collectCards(state.table)
  const newDefenderIndex = state.defenderIndex
  const newAttackerIndex = state.attackerIndex

  let nextState: GameState = {
    ...state,
    table: [],
    discard: [...state.discard, ...tableCards],
    attackerIndex: newDefenderIndex,
    defenderIndex: newAttackerIndex,
    phase: "attack",
    currentPlayerId: state.players[newDefenderIndex]!.id,
  }

  const events: DomainEvent[] = [
    { type: "round.passed", payload: { attackerId: attacker.id } },
  ]

  const { state: refilledState, deals } = refillHands(nextState, container)
  nextState = refilledState

  if (deals.length > 0) {
    events.push({
      type: "cards.dealt",
      payload: {
        deals: deals.map((deal) => ({
          playerId: deal.playerId,
          card: toCardDTO(deal.card),
        })),
      },
    })
  }

  nextState = checkGameEnd(nextState)

  return buildResult(nextState, container, viewerId, events)
}

function refillHands(
  state: GameState,
  container: EngineContainer,
): { state: GameState; deals: { playerId: string; card: Card }[] } {
  let deck = state.deck
  const players = [...state.players]
  const deals: { playerId: string; card: Card }[] = []

  const order = [state.attackerIndex, state.defenderIndex]

  for (const playerIndex of order) {
    while (deck.length > 0 && players[playerIndex]!.hand.length < HAND_SIZE) {
      const drawResult = container.deck.draw(deck, 1)
      deck = drawResult.deck
      const card = drawResult.cards[0]
      if (!card) break

      const currentPlayer = players[playerIndex]!
      players[playerIndex] = {
        ...currentPlayer,
        hand: container.hand.addCards(currentPlayer.hand, [card]),
      }
      deals.push({ playerId: currentPlayer.id, card })
    }
  }

  return { state: { ...state, deck, players }, deals }
}

function checkGameEnd(state: GameState): GameState {
  if (state.deck.length > 0) return state

  const playerWithEmptyHand = state.players.find((player) => player.hand.length === 0)
  if (!playerWithEmptyHand) return state

  const loser = state.players.find((player) => player.hand.length > 0)
  if (!loser) return state

  const winner = playerWithEmptyHand

  return {
    ...state,
    phase: "finished",
    winnerId: winner.id,
    loserId: loser.id,
    currentPlayerId: winner.id,
  }
}

function buildResult(
  state: GameState,
  container: EngineContainer,
  viewerId: string,
  events: DomainEvent[],
): WorkflowResult<GameState, GameViewDTO> {
  const legalMoves = getLegalMoves(state, container)
  const view = toGameViewDTO(state, viewerId, legalMoves)

  const finalEvents = [...events]
  if (state.phase === "finished" && state.winnerId && state.loserId) {
    finalEvents.push({
      type: "game.ended",
      payload: { winnerId: state.winnerId, loserId: state.loserId },
    })
  }

  return { ok: true, state, view, events: finalEvents }
}

export function getLegalMoves(state: GameState, container: EngineContainer): LegalMoveDTO[] {
  if (state.phase === "finished") return []

  const moves: LegalMoveDTO[] = []
  const currentPlayer = container.turn.getPlayerById(state, state.currentPlayerId)
  if (!currentPlayer) return moves

  if (state.phase === "attack") {
    for (const card of currentPlayer.hand) {
      moves.push({ command: { type: "attack", cardId: card.id }, cardId: card.id })
    }
    return moves
  }

  if (state.phase === "defend") {
    moves.push({ command: { type: "take" } })

    const pairIndex = container.table.getUndefendedPairIndex(state.table)
    if (pairIndex === null) return moves

    const attackCard = state.table[pairIndex]?.attack
    if (!attackCard) return moves

    for (const card of currentPlayer.hand) {
      if (container.rules.canBeat(attackCard, card, state.trump.suit)) {
        moves.push({
          command: { type: "defend", cardId: card.id, pairIndex },
          cardId: card.id,
          pairIndex,
        })
      }
    }

    return moves
  }

  if (state.phase === "throw_in") {
    moves.push({ command: { type: "pass" } })

    if (!container.rules.canAddToTable(state)) {
      return moves
    }

    for (const card of currentPlayer.hand) {
      if (container.rules.canThrowIn(card, state.table)) {
        moves.push({
          command: { type: "throw_in", cardIds: [card.id] },
          cardId: card.id,
        })
      }
    }
  }

  return moves
}

export function getCardIdsFromCommand(command: GameCommand): string[] {
  switch (command.type) {
    case "attack":
    case "defend":
      return [command.cardId]
    case "throw_in":
      return command.cardIds
    case "take":
    case "pass":
      return []
  }
}

export function getCardIdFromCommand(command: GameCommand): string | null {
  return getCardIdsFromCommand(command)[0] ?? null
}

export function peekBotCommand(
  state: GameState,
  container: EngineContainer,
): GameCommand | null {
  const currentPlayer = container.turn.getPlayerById(state, state.currentPlayerId)
  if (!currentPlayer?.isBot || state.phase === "finished") return null
  return container.bot.pickCommand(state, container)
}

export function runBotTurnIfNeeded(
  state: GameState,
  container: EngineContainer,
  viewerId: string = HUMAN_PLAYER_ID,
): WorkflowResult<GameState, GameViewDTO> | null {
  const currentPlayer = container.turn.getPlayerById(state, state.currentPlayerId)
  if (!currentPlayer?.isBot || state.phase === "finished") return null

  const command = container.bot.pickCommand(state, container)
  if (!command) return null

  const result = executeCommandWorkflow(state, command, currentPlayer.id, container, viewerId)
  if (!result.ok) return null

  return result
}

export function forfeitGameWorkflow(
  state: GameState,
  forfeitingPlayerId: string,
  container: EngineContainer,
  viewerId: string = HUMAN_PLAYER_ID,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase === "finished") {
    return fail("GAME_FINISHED", "Game is already finished")
  }

  if (state.currentPlayerId !== forfeitingPlayerId) {
    return fail("NOT_YOUR_TURN", "Not this player's turn")
  }

  const forfeitingPlayer = container.turn.getPlayerById(state, forfeitingPlayerId)
  if (!forfeitingPlayer) {
    return fail("ILLEGAL_MOVE", "Player not found")
  }

  const winner = state.players.find((player) => player.id !== forfeitingPlayerId)
  if (!winner) {
    return fail("ILLEGAL_MOVE", "Cannot determine winner")
  }

  const nextState: GameState = {
    ...state,
    phase: "finished",
    winnerId: winner.id,
    loserId: forfeitingPlayerId,
    currentPlayerId: winner.id,
  }

  return buildResult(nextState, container, viewerId, [])
}

export function surrenderGameWorkflow(
  state: GameState,
  surrenderingPlayerId: string,
  container: EngineContainer,
  viewerId: string = HUMAN_PLAYER_ID,
): WorkflowResult<GameState, GameViewDTO> {
  if (state.phase === "finished") {
    return fail("GAME_FINISHED", "Game is already finished")
  }

  const surrenderingPlayer = container.turn.getPlayerById(state, surrenderingPlayerId)
  if (!surrenderingPlayer) {
    return fail("ILLEGAL_MOVE", "Player not found")
  }

  const winner = state.players.find((player) => player.id !== surrenderingPlayerId)
  if (!winner) {
    return fail("ILLEGAL_MOVE", "Cannot determine winner")
  }

  const nextState: GameState = {
    ...state,
    phase: "finished",
    winnerId: winner.id,
    loserId: surrenderingPlayerId,
    currentPlayerId: winner.id,
  }

  return buildResult(nextState, container, viewerId, [])
}
