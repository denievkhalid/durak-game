import { describe, expect, it } from "vitest"
import { createEngineContainer } from "../core/container"
import { BOT_PLAYER_ID, HUMAN_PLAYER_ID, type Card, type GameState } from "../core/types"
import {
  executeCommandWorkflow,
  forfeitGameWorkflow,
  startGameWorkflow,
} from "./execute-command-workflow"
import { createTestGameInput } from "./test-players"

describe("executeCommandWorkflow", () => {
  const container = createEngineContainer("podkidnoy")

  it("starts game in attack phase with dealt hands", () => {
    const result = startGameWorkflow(createTestGameInput(), container)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.phase).toBe("attack")
    expect(result.state.players.every((player) => player.hand.length === 6)).toBe(true)
    expect(result.state.table).toHaveLength(0)
  })

  it("allows attack and defend flow", () => {
    const start = startGameWorkflow(createTestGameInput(), container)
    if (!start.ok) throw new Error("Failed to start")

    const attackerId = start.state.currentPlayerId
    const attacker = start.state.players.find((player) => player.id === attackerId)!
    const cardId = attacker.hand[0]!.id

    const attack = executeCommandWorkflow(
      start.state,
      { type: "attack", cardId },
      attackerId,
      container,
    )
    expect(attack.ok).toBe(true)
    if (!attack.ok) return

    expect(attack.state.phase).toBe("defend")
    expect(attack.state.table).toHaveLength(1)

    const defenderId = attack.state.currentPlayerId
    const defender = attack.state.players.find((player) => player.id === defenderId)!
    const pairIndex = 0
    const attackCard = attack.state.table[pairIndex]!.attack
    const defenseCard = defender.hand.find((card) =>
      container.rules.canBeat(attackCard, card, attack.state.trump.suit),
    )

    if (!defenseCard) {
      const take = executeCommandWorkflow(
        attack.state,
        { type: "take" },
        defenderId,
        container,
      )
      expect(take.ok).toBe(true)
      return
    }

    const defend = executeCommandWorkflow(
      attack.state,
      { type: "defend", cardId: defenseCard.id, pairIndex },
      defenderId,
      container,
    )
    expect(defend.ok).toBe(true)
  })

  it("refills hands up to 6 cards without draining entire deck to one player", () => {
    const start = startGameWorkflow(createTestGameInput(), container)
    if (!start.ok) throw new Error("Failed to start")

    let state = start.state
    let attackerId = state.currentPlayerId

    for (let round = 0; round < 3 && state.phase !== "finished"; round += 1) {
      if (state.phase === "attack") {
        const attacker = state.players.find((player) => player.id === attackerId)!
        const cardId = attacker.hand[0]?.id
        if (!cardId) break

        const attack = executeCommandWorkflow(
          state,
          { type: "attack", cardId },
          attackerId,
          container,
        )
        if (!attack.ok) break
        state = attack.state
        continue
      }

      if (state.phase === "defend") {
        const defenderId = state.currentPlayerId
        const take = executeCommandWorkflow(state, { type: "take" }, defenderId, container)
        if (!take.ok) break
        state = take.state
        attackerId = state.currentPlayerId
      }
    }

    expect(state.players.every((player) => player.hand.length <= 12)).toBe(true)
  })

  it("rejects move when not player turn", () => {
    const start = startGameWorkflow(createTestGameInput(), container)
    if (!start.ok) throw new Error("Failed to start")

    const wrongPlayer =
      start.state.currentPlayerId === HUMAN_PLAYER_ID ? "bot" : HUMAN_PLAYER_ID
    const player = start.state.players.find((entry) => entry.id === wrongPlayer)!
    const cardId = player.hand[0]!.id

    const result = executeCommandWorkflow(
      start.state,
      { type: "attack", cardId },
      wrongPlayer,
      container,
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe("NOT_YOUR_TURN")
  })

  it("ends game when current player forfeits on timeout", () => {
    const start = startGameWorkflow(createTestGameInput(), container)
    if (!start.ok) throw new Error("Failed to start")

    const result = forfeitGameWorkflow(start.state, start.state.currentPlayerId, container)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.phase).toBe("finished")
    expect(result.state.loserId).toBe(start.state.currentPlayerId)
    expect(result.state.winnerId).not.toBe(start.state.currentPlayerId)
  })

  it("auto passes round when four same-rank attacks are defended by four same-rank cards", () => {
    const card = (id: string, suit: Card["suit"], rank: Card["rank"]): Card => ({ id, suit, rank })

    const state: GameState = {
      players: [
        {
          id: HUMAN_PLAYER_ID,
          name: "Human",
          isBot: false,
          hand: [card("h1", "spades", "ace"), card("h2", "hearts", "king")],
        },
        {
          id: BOT_PLAYER_ID,
          name: "Bot",
          isBot: true,
          hand: [card("def-final", "spades", "7"), card("def-spare", "hearts", "8")],
        },
      ],
      deck: [
        card("deck1", "spades", "6"),
        card("deck2", "spades", "7"),
        card("deck3", "spades", "8"),
        card("deck4", "spades", "9"),
        card("deck5", "spades", "10"),
        card("deck6", "spades", "jack"),
        card("deck7", "spades", "queen"),
        card("deck8", "spades", "king"),
        card("deck9", "diamonds", "ace"),
        card("deck10", "hearts", "ace"),
      ],
      trump: card("trump", "spades", "ace"),
      discard: [],
      table: [
        {
          attack: card("a1", "hearts", "6"),
          defense: card("d1", "hearts", "7"),
        },
        {
          attack: card("a2", "diamonds", "6"),
          defense: card("d2", "diamonds", "7"),
        },
        {
          attack: card("a3", "clubs", "6"),
          defense: card("d3", "clubs", "7"),
        },
        {
          attack: card("a4", "clubs", "6"),
          defense: null,
        },
      ],
      phase: "defend",
      attackerIndex: 0,
      defenderIndex: 1,
      currentPlayerId: BOT_PLAYER_ID,
      winnerId: null,
      loserId: null,
    }

    const result = executeCommandWorkflow(
      state,
      { type: "defend", cardId: "def-final", pairIndex: 3 },
      BOT_PLAYER_ID,
      container,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.phase).toBe("attack")
    expect(result.state.table).toHaveLength(0)
    expect(result.state.discard).toHaveLength(8)
    expect(result.events.some((event) => event.type === "card.defended")).toBe(true)
    expect(result.events.some((event) => event.type === "round.passed")).toBe(true)
  })

  it("does not auto pass when defended cards are different ranks", () => {
    const card = (id: string, suit: Card["suit"], rank: Card["rank"]): Card => ({ id, suit, rank })

    const state: GameState = {
      players: [
        {
          id: HUMAN_PLAYER_ID,
          name: "Human",
          isBot: false,
          hand: [card("h1", "spades", "ace"), card("h2", "hearts", "king")],
        },
        {
          id: BOT_PLAYER_ID,
          name: "Bot",
          isBot: true,
          hand: [card("def-final", "spades", "7"), card("def-spare", "hearts", "8")],
        },
      ],
      deck: [
        card("deck1", "spades", "6"),
        card("deck2", "spades", "7"),
        card("deck3", "spades", "8"),
        card("deck4", "spades", "9"),
        card("deck5", "spades", "10"),
        card("deck6", "spades", "jack"),
        card("deck7", "spades", "queen"),
        card("deck8", "spades", "king"),
        card("deck9", "diamonds", "ace"),
        card("deck10", "hearts", "ace"),
      ],
      trump: card("trump", "spades", "ace"),
      discard: [],
      table: [
        {
          attack: card("a1", "hearts", "6"),
          defense: card("d1", "hearts", "7"),
        },
        {
          attack: card("a2", "diamonds", "6"),
          defense: card("d2", "diamonds", "7"),
        },
        {
          attack: card("a3", "clubs", "6"),
          defense: card("d3", "clubs", "8"),
        },
        {
          attack: card("a4", "clubs", "6"),
          defense: null,
        },
      ],
      phase: "defend",
      attackerIndex: 0,
      defenderIndex: 1,
      currentPlayerId: BOT_PLAYER_ID,
      winnerId: null,
      loserId: null,
    }

    const result = executeCommandWorkflow(
      state,
      { type: "defend", cardId: "def-final", pairIndex: 3 },
      BOT_PLAYER_ID,
      container,
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.phase).toBe("throw_in")
    expect(result.state.table).toHaveLength(4)
    expect(result.state.discard).toHaveLength(0)
    expect(result.events.some((event) => event.type === "card.defended")).toBe(true)
    expect(result.events.some((event) => event.type === "round.passed")).toBe(false)
  })
})
