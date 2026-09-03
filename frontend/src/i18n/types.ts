export type Locale = 'tr' | 'en'

export type TranslationParams = Record<string, string | number>

export type Messages = {
  [key: string]: string | Messages
}
