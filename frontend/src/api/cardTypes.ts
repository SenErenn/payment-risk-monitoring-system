export type CardType = 'Credit' | 'Debit'

export type CardStatus = 'Active' | 'Blocked' | 'Passive' | 'Expired'

export interface Card {
  id: string
  cardToken: string
  maskedCardNumber: string
  cardType: CardType
  status: CardStatus
  creditLimit: number
  availableLimit: number
  createdAt: string
  updatedAt: string
}

export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface CardListParams {
  page?: number
  pageSize?: number
  search?: string
  status?: CardStatus | null
  cardType?: CardType | null
}

export interface CreateCardPayload {
  cardType: CardType
  creditLimit: number
  availableLimit: number
  lastFourDigits: string
  status: CardStatus
}

export interface UpdateCardPayload {
  creditLimit: number
  availableLimit: number
}

export interface UpdateCardStatusPayload {
  status: CardStatus
}
