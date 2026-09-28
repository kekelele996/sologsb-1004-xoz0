export type ScriptStatus = 'draft' | 'review' | 'returned' | 'approved'
export type DeviceKind = 'desktop' | 'tablet' | 'mobile' | 'kiosk'

export interface HallIntro {
  languageId: string
  content: string
  updatedAt: string
}

export interface SegmentReference {
  // 引用时（或上次确认时）的展厅导语原文；导语改动后、确认前一直保留旧导语
  introSnapshot: string
  linkedAt: string
}

export interface Hall {
  id: string
  name: string
  description: string
  intros: HallIntro[]
}

export interface Segment {
  id: string
  label: string
  content: string
  locked: boolean
  // 引用本展厅同语言的公共导语；content 为接在导语之后的本展项补充内容
  hallIntroRef?: SegmentReference
}

export interface LanguageDraft {
  id: string
  languageId: string
  title: string
  narration: string
  accessibility: string
  durationMinutes: number
  sources: string
  status: ScriptStatus
  segments: Segment[]
  updatedAt: string
}

export interface Exhibit {
  id: string
  hallId: string
  code: string
  title: string
  order: number
  drafts: LanguageDraft[]
}

export interface Language {
  id: string
  code: string
  label: string
  shortLabel: string
}

export interface VersionSnapshot {
  id: string
  exhibitId: string
  languageId: string
  name: string
  createdAt: string
  draft: LanguageDraft
}

export interface HallIntroReferenceRow {
  exhibitId: string
  code: string
  exhibitTitle: string
  segmentId: string
  label: string
  locked: boolean
  stale: boolean
}

export interface PersistedState {
  halls: Hall[]
  exhibits: Exhibit[]
  versions: VersionSnapshot[]
  selectedHallId: string
  selectedExhibitId: string
  selectedLanguageId: string
  lastSavedAt: string
}

export interface DiffLine {
  type: 'same' | 'add' | 'remove'
  text: string
}
