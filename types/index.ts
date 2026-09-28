export type ScriptStatus = 'draft' | 'review' | 'returned' | 'approved'
export type DeviceKind = 'desktop' | 'tablet' | 'mobile' | 'kiosk'
export type IntroState = 'none' | 'missing' | 'synced' | 'pending'

/** 展厅公共导语，按语言各维护一份 */
export interface HallIntro {
  languageId: string
  content: string
  updatedAt: string
}

export interface Hall {
  id: string
  name: string
  description: string
  intros: HallIntro[]
}

/** 段落对展厅导语的引用；syncedContent 是本段落已确认使用的导语（可能是旧导语） */
export interface IntroRef {
  languageId: string
  pending: boolean
  syncedContent: string
  updatedAt: string
}

export interface Segment {
  id: string
  label: string
  /** 不引用导语时为整段文字；引用导语时为本展项补写的内容 */
  content: string
  locked: boolean
  introRef?: IntroRef
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

export interface IntroUsage {
  exhibit: Exhibit
  draft: LanguageDraft
  segment: Segment
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
