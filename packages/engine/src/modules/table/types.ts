import type { Card } from "../../core/types/card"
import type { TablePair } from "../../core/types"

export type Table = TablePair[]

export interface ITableService {
  addAttack(table: Table, card: Card): Table
  setDefense(table: Table, pairIndex: number, card: Card): Table | null
  allDefended(table: Table): boolean
  getTableRanks(table: Table): Card["rank"][]
  getUndefendedPairIndex(table: Table): number | null
  collectCards(table: Table): Card[]
  isEmpty(table: Table): boolean
  pairCount(table: Table): number
}
