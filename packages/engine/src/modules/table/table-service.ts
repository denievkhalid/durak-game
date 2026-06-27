import type { Card } from "../../core/types/card"
import type { ITableService, Table } from "./types"

export class TableService implements ITableService {
  addAttack(table: Table, card: Card): Table {
    return [...table, { attack: card, defense: null }]
  }

  setDefense(table: Table, pairIndex: number, card: Card): Table | null {
    const pair = table[pairIndex]
    if (!pair || pair.defense !== null) return null

    return table.map((entry, index) =>
      index === pairIndex ? { ...entry, defense: card } : entry,
    )
  }

  allDefended(table: Table): boolean {
    return table.length > 0 && table.every((pair) => pair.defense !== null)
  }

  getTableRanks(table: Table): Card["rank"][] {
    const ranks = new Set<Card["rank"]>()
    for (const pair of table) {
      ranks.add(pair.attack.rank)
      if (pair.defense) ranks.add(pair.defense.rank)
    }
    return [...ranks]
  }

  getUndefendedPairIndex(table: Table): number | null {
    const index = table.findIndex((pair) => pair.defense === null)
    return index === -1 ? null : index
  }

  collectCards(table: Table): Card[] {
    return table.flatMap((pair) =>
      pair.defense ? [pair.attack, pair.defense] : [pair.attack],
    )
  }

  isEmpty(table: Table): boolean {
    return table.length === 0
  }

  pairCount(table: Table): number {
    return table.length
  }
}

export type { ITableService, Table } from "./types"
