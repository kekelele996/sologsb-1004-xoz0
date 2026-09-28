import { defineStore } from 'pinia'
import type { Exhibit, Hall, HallIntro, HallIntroReferenceRow, Language, LanguageDraft, PersistedState, ScriptStatus, Segment, VersionSnapshot } from '~/types'

export const LANGUAGES: Language[] = [
  { id: 'zh', code: 'zh-CN', label: '简体中文', shortLabel: '中' },
  { id: 'en', code: 'en-US', label: 'English', shortLabel: 'EN' },
  { id: 'ja', code: 'ja-JP', label: '日本語', shortLabel: '日' }
]

const STORAGE_KEY = 'museum-script-studio-v1'

const segments = (prefix: string, values: Array<[string, string, boolean?]>): Segment[] => values.map(([label, content, locked], index) => ({
  id: `${prefix}-${index + 1}`,
  label,
  content,
  locked: Boolean(locked)
}))

// 为已有段落挂上“引用展厅导语”标记（快照 = 引用时的导语原文）
const withIntroRef = (segment: Segment, introSnapshot: string, linkedAt: string): Segment => ({
  ...segment,
  hallIntroRef: { introSnapshot, linkedAt }
})

function demoState(): PersistedState {
  const ancientIntroZh = '欢迎来到文明肇始厅。本厅展出从史前聚落到先秦礼乐文明的代表性文物，展线按照时间顺序展开，全程约十五分钟。'
  const ancientIntroZhOld = '欢迎来到文明肇始厅。本厅展出史前至先秦时期的重要文物，请按展线顺序参观。'
  const ancientIntroEn = 'Welcome to the Origins of Civilisation Hall. The gallery traces early Chinese societies from prehistoric settlements to the ritual culture of the pre-Qin era, in roughly chronological order.'
  const silkIntroZh = '欢迎来到丝路交融厅。本厅以丝绸之路上的材料、纹样与信仰为线索，呈现东西交流中的日常生活。'

  const halls: Hall[] = [
    {
      id: 'hall-ancient', name: '文明肇始厅', description: '史前至先秦文明，共 18 个展项',
      intros: [
        { languageId: 'zh', content: ancientIntroZh, updatedAt: '2026-09-25T03:00:00.000Z' },
        { languageId: 'en', content: ancientIntroEn, updatedAt: '2026-09-24T08:30:00.000Z' }
      ]
    },
    {
      id: 'hall-silk', name: '丝路交融厅', description: '丝绸之路上的器物、信仰与生活',
      intros: [{ languageId: 'zh', content: silkIntroZh, updatedAt: '2026-09-20T03:00:00.000Z' }]
    },
    {
      id: 'hall-city', name: '城市记忆厅', description: '近现代城市空间与市民生活',
      intros: []
    }
  ]
  const exhibits: Exhibit[] = [
    {
      id: 'exhibit-jade', hallId: 'hall-ancient', code: 'A-03', title: '玉琮：沟通天地的礼器', order: 3,
      drafts: [
        {
          id: 'draft-jade-zh', languageId: 'zh', title: '玉琮：沟通天地的礼器',
          narration: '这件玉琮出土于长江下游的良渚遗址。它外方内圆，四角雕刻神人兽面纹，体现了新石器时代晚期精湛的玉器工艺。',
          accessibility: '玉琮为深青色，高约二十厘米。触摸模型可感受方形四角与中央圆孔；圆孔贯穿器身。',
          durationMinutes: 2.5, sources: '《中国玉器全集》第一卷；本馆藏品档案 1987-J-042',
          status: 'approved', updatedAt: '2026-09-23T08:35:00.000Z',
          segments: [
            // 引用公共导语：导语已更新但尚未确认复核 → 保留旧导语并显示“待复核”
            withIntroRef(
              { id: 'jade-zh-1', label: '开场导语', content: '这件玉琮来自距今约五千年的良渚文化。', locked: false },
              ancientIntroZhOld, '2026-09-22T01:00:00.000Z'
            ),
            ...segments('jade-zh', [
              ['器物观察', '它外方内圆，四角雕刻神人兽面纹。', true],
              ['文化含义', '玉琮常被看作沟通天地的礼器，也象征权力与身份。'],
              ['参观提示', '请沿展柜顺时针观察，触摸复制品前先使用免洗消毒液。']
            ])
          ]
        },
        {
          id: 'draft-jade-en', languageId: 'en', title: 'Jade Cong: A Ritual Object Between Heaven and Earth',
          narration: 'This jade cong was made by the Liangzhu culture. Its square exterior and circular bore embody an early Chinese vision of the cosmos.',
          accessibility: 'The object is dark green. A tactile model shows four corners, carved faces, and a central circular opening.',
          durationMinutes: 2.3, sources: 'Complete Collection of Chinese Jades, Vol. 1; Museum accession 1987-J-042',
          status: 'review', updatedAt: '2026-09-24T02:15:00.000Z',
          segments: [
            withIntroRef(
              { id: 'jade-en-1', label: 'Introduction', content: 'This jade cong is about five thousand years old.', locked: false },
              ancientIntroEn, '2026-09-24T08:35:00.000Z'
            ),
            ...segments('jade-en', [
              ['Visual description', 'Its square body encloses a circular opening, while spirit-and-animal motifs cover the corners.', true],
              ['Meaning', 'Jade cong is understood as a ritual link between heaven and earth.']
            ])
          ]
        },
        {
          id: 'draft-jade-ja', languageId: 'ja', title: '玉琮：天と地を結ぶ礼器',
          narration: 'こちらは良渚文化の玉琮です。外側は方形、中央は円形で、四隅には神人獣面文が刻まれています。',
          accessibility: '暗い青緑色の玉製です。複製模型では四つの角と中央の円孔を触って確認できます。',
          durationMinutes: 2.6, sources: '『中国玉器全集』第一巻；収蔵資料 1987-J-042',
          status: 'draft', updatedAt: '2026-09-21T06:10:00.000Z',
          segments: segments('jade-ja', [
            ['導入', '約五千年前の良渚文化を代表する玉琮です。'],
            ['観察', '外側は方形、中央は円形で、四隅に精緻な文様があります。'],
            ['意味', '天地を結ぶ礼器として、力と身分を象徴しました。']
          ])
        }
      ]
    },
    {
      id: 'exhibit-bronze', hallId: 'hall-ancient', code: 'A-08', title: '青铜爵与礼制', order: 8,
      drafts: [
        {
          id: 'draft-bronze-zh', languageId: 'zh', title: '青铜爵与礼制',
          narration: '爵是最早的青铜酒器之一。三足稳定器身，长流便于倾倒，柱饰则与商周礼仪密切相关。',
          accessibility: '器物为青铜色，器口一侧有长流，底部三足支撑。复制件配有可触摸的局部纹样。',
          durationMinutes: 3, sources: '《殷周青铜器通论》；展品说明卡 A-08',
          status: 'returned', updatedAt: '2026-09-23T11:20:00.000Z',
          segments: [
            // 与现导语一致的引用段，展示“已同步”状态
            withIntroRef(
              { id: 'bronze-zh-1', label: '开场导语', content: '接下来请看这件用于宴饮的青铜爵。', locked: false },
              ancientIntroZh, '2026-09-25T03:10:00.000Z'
            ),
            ...segments('bronze-zh', [
              ['器物介绍', '这是一件商代青铜爵，用于温酒和饮酒。'],
              ['结构说明', '三足使器身稳定，前端的流便于倾倒。'],
              ['礼制背景', '青铜器数量与形制反映了使用者的身份。'],
              ['修改说明', '审校意见：补充“柱饰”的用途，并核对年代。']
            ])
          ]
        },
        {
          id: 'draft-bronze-en', languageId: 'en', title: 'Bronze Jue and Ritual Order',
          narration: 'The jue was among the earliest bronze drinking vessels. Its tripod base, pouring spout, and posts were closely tied to Shang and Zhou ritual.',
          accessibility: 'The tactile replica includes the long spout, tripod feet, and raised posts.',
          durationMinutes: 2.8, sources: 'A General Survey of Yin-Zhou Bronzes; Gallery label A-08',
          status: 'draft', updatedAt: '2026-09-22T09:00:00.000Z',
          segments: segments('bronze-en', [['Object', 'This bronze jue dates to the Shang dynasty.'], ['Structure', 'Three legs support the body; the long spout guides the pour.']])
        }
      ]
    },
    {
      id: 'exhibit-silk', hallId: 'hall-silk', code: 'B-02', title: '织机与丝路纹样', order: 2,
      drafts: [{
        id: 'draft-silk-zh', languageId: 'zh', title: '织机与丝路纹样',
        narration: '织机把一根根丝线组织成布匹，也把不同地区的图案与故事连接在一起。',
        accessibility: '体验区提供放大纹样、凸点经纬结构以及可操作的小型织机模型。',
        durationMinutes: 4, sources: '馆内教育活动资料；丝绸之路纺织史专题',
        status: 'draft', updatedAt: '2026-09-20T03:00:00.000Z',
        segments: [
          withIntroRef(
            { id: 'silk-zh-1', label: '开场导语', content: '丝绸不只是一种材料，也是交流的媒介。', locked: false },
            silkIntroZh, '2026-09-20T03:05:00.000Z'
          ),
          ...segments('silk-zh', [['互动', '请试着推动梭子，观察经纬线如何交会。']])
        ]
      }]
    }
  ]
  return {
    halls,
    exhibits,
    versions: [],
    selectedHallId: halls[0].id,
    selectedExhibitId: exhibits[0].id,
    selectedLanguageId: 'zh',
    lastSavedAt: new Date().toISOString()
  }
}

// 旧版本本地数据迁移：补齐展厅导语数组与段落引用字段
function normalizeState(state: PersistedState): PersistedState {
  const halls = state.halls.map(hall => ({
    ...hall,
    intros: Array.isArray(hall.intros)
      ? hall.intros.map(intro => ({
          languageId: intro.languageId,
          content: typeof intro.content === 'string' ? intro.content : '',
          updatedAt: intro.updatedAt || new Date().toISOString()
        }))
      : []
  }))
  const exhibits = state.exhibits.map(exhibit => ({
    ...exhibit,
    drafts: exhibit.drafts.map(draft => ({
      ...draft,
      segments: draft.segments.map(segment => {
        const next: Segment = { ...segment, hallIntroRef: undefined }
        if (segment.hallIntroRef && typeof segment.hallIntroRef.introSnapshot === 'string') {
          next.hallIntroRef = {
            introSnapshot: segment.hallIntroRef.introSnapshot,
            linkedAt: segment.hallIntroRef.linkedAt || new Date().toISOString()
          }
        }
        return next
      })
    }))
  }))
  return { ...state, halls, exhibits }
}

export const useScriptStore = defineStore('museum-script', {
  state: () => ({
    halls: [] as Hall[],
    exhibits: [] as Exhibit[],
    versions: [] as VersionSnapshot[],
    selectedHallId: '',
    selectedExhibitId: '',
    selectedLanguageId: 'zh',
    lastSavedAt: '',
    hydrated: false,
    past: [] as string[],
    future: [] as string[],
    notice: ''
  }),
  getters: {
    selectedHall(state): Hall | undefined {
      return state.halls.find(hall => hall.id === state.selectedHallId)
    },
    hallExhibits(state): Exhibit[] {
      return state.exhibits.filter(exhibit => exhibit.hallId === state.selectedHallId).sort((a, b) => a.order - b.order)
    },
    selectedExhibit(state): Exhibit | undefined {
      return state.exhibits.find(exhibit => exhibit.id === state.selectedExhibitId)
    },
    selectedDraft(): LanguageDraft | undefined {
      return this.selectedExhibit?.drafts.find(draft => draft.languageId === this.selectedLanguageId)
    },
    wordCount(): number {
      return (this.selectedDraft?.narration || '').replace(/\s/g, '').length
    },
    canUndo(state): boolean { return state.past.length > 0 },
    canRedo(state): boolean { return state.future.length > 0 }
  },
  actions: {
    hydrate() {
      if (this.hydrated || typeof localStorage === 'undefined') return
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const data = normalizeState(JSON.parse(saved) as PersistedState)
          this.$patch({ ...data, hydrated: true })
          if (!this.halls.length || !this.exhibits.length) this.resetDemo()
          else this.persist()
        } catch {
          this.resetDemo()
        }
      } else {
        this.resetDemo()
      }
      this.ensureSelection()
      this.hydrated = true
    },
    resetDemo() {
      this.$patch({ ...demoState(), hydrated: true, past: [], future: [] })
      this.persist()
      this.notice = '示例数据已就绪，可直接开始编辑。'
    },
    snapshot(): string {
      return JSON.stringify({ halls: this.halls, exhibits: this.exhibits, versions: this.versions })
    },
    commit(mutator: () => void) {
      this.past.push(this.snapshot())
      if (this.past.length > 50) this.past.shift()
      this.future = []
      mutator()
      this.lastSavedAt = new Date().toISOString()
      this.persist()
    },
    persist() {
      if (typeof localStorage === 'undefined') return
      const data: PersistedState = {
        halls: this.halls, exhibits: this.exhibits, versions: this.versions,
        selectedHallId: this.selectedHallId, selectedExhibitId: this.selectedExhibitId,
        selectedLanguageId: this.selectedLanguageId, lastSavedAt: this.lastSavedAt
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    },
    ensureSelection() {
      if (!this.halls.some(hall => hall.id === this.selectedHallId)) this.selectedHallId = this.halls[0]?.id || ''
      const inHall = this.exhibits.filter(exhibit => exhibit.hallId === this.selectedHallId)
      if (!inHall.some(exhibit => exhibit.id === this.selectedExhibitId)) this.selectedExhibitId = inHall[0]?.id || ''
      const exhibit = this.selectedExhibit
      if (!exhibit?.drafts.some(draft => draft.languageId === this.selectedLanguageId)) this.selectedLanguageId = exhibit?.drafts[0]?.languageId || 'zh'
    },
    selectHall(id: string) {
      this.selectedHallId = id
      const exhibit = this.exhibits.find(item => item.hallId === id)
      this.selectedExhibitId = exhibit?.id || ''
      this.ensureSelection()
      this.persist()
    },
    selectExhibit(id: string) {
      this.selectedExhibitId = id
      this.ensureSelection()
      this.persist()
    },
    selectLanguage(id: string) {
      this.selectedLanguageId = id
      this.persist()
    },
    // 找到指定展厅、指定语言的导语对象；不存在时返回 undefined（导语可为空）
    hallIntro(hallId: string, languageId: string): HallIntro | undefined {
      return this.halls.find(hall => hall.id === hallId)?.intros.find(intro => intro.languageId === languageId)
    },
    // 段落当前引用的导语原文（旧导语）
    referencedIntro(segment: Segment): string {
      return segment.hallIntroRef?.introSnapshot || ''
    },
    // 展厅该语言导语改动后，引用它但还未确认的段落即为待复核
    isSegmentStale(segment: Segment, hallId: string, languageId: string): boolean {
      if (!segment.hallIntroRef) return false
      const intro = this.hallIntro(hallId, languageId)
      return (intro?.content || '') !== segment.hallIntroRef.introSnapshot
    },
    // 段落完整文案：先导语后本展项补充，中文语境下直接拼接
    segmentFullText(segment: Segment, hallId: string, languageId: string): string {
      if (!segment.hallIntroRef) return segment.content
      const intro = segment.hallIntroRef.introSnapshot
      const rest = segment.content
      return [intro, rest].filter(Boolean).join(languageId === 'zh' ? '' : '\n')
    },
    updateDraft(patch: Partial<Pick<LanguageDraft, 'title' | 'narration' | 'accessibility' | 'durationMinutes' | 'sources'>>) {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => Object.assign(draft, patch, { updatedAt: new Date().toISOString() }))
      this.notice = '改动已自动保存到浏览器。'
    },
    updateSegment(id: string, patch: Partial<Pick<Segment, 'label' | 'content'>>) {
      const segment = this.selectedDraft?.segments.find(item => item.id === id)
      if (!segment || segment.locked) return
      // 引用导语时，content 只承载导语之后的本展项补充内容
      this.commit(() => Object.assign(segment, patch))
    },
    toggleLock(id: string) {
      const segment = this.selectedDraft?.segments.find(item => item.id === id)
      if (!segment) return
      this.commit(() => { segment.locked = !segment.locked })
      this.notice = segment.locked ? '段落已锁定，避免误改。' : '段落已解锁。'
    },
    addSegment() {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => draft.segments.push({ id: `segment-${Date.now()}`, label: `新段落 ${draft.segments.length + 1}`, content: '', locked: false }))
    },
    removeSegment(id: string) {
      const draft = this.selectedDraft
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !segment || segment.locked) return
      this.commit(() => { draft.segments = draft.segments.filter(item => item.id !== id) })
    },
    // 编辑展厅某语言的公共导语；内容变化后，所有引用该导语的段落进入待复核
    updateHallIntro(hallId: string, languageId: string, content: string) {
      const hall = this.halls.find(item => item.id === hallId)
      if (!hall) return
      const existing = hall.intros.find(intro => intro.languageId === languageId)
      if (existing && existing.content === content) return
      let staleCount = 0
      this.commit(() => {
        const now = new Date().toISOString()
        if (existing) {
          existing.content = content
          existing.updatedAt = now
        } else {
          hall.intros.push({ languageId, content, updatedAt: now })
        }
      })
      if (content) {
        for (const exhibit of this.exhibits.filter(item => item.hallId === hallId)) {
          for (const draft of exhibit.drafts.filter(item => item.languageId === languageId)) {
            staleCount += draft.segments.filter(segment => this.isSegmentStale(segment, hallId, languageId)).length
          }
        }
      }
      this.notice = staleCount
        ? `导语已更新，${staleCount} 个引用段落待复核；确认前仍保留旧导语。`
        : '展厅导语已保存。'
    },
    // 段落引用 / 取消引用本展厅当前语言的导语
    setSegmentReference(id: string, referenced: boolean) {
      const draft = this.selectedDraft
      const exhibit = this.selectedExhibit
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !exhibit || !segment || segment.locked) return
      const intro = this.hallIntro(exhibit.hallId, draft.languageId)
      if (referenced) {
        if (!intro || !intro.content) {
          this.notice = '当前语言还没有展厅导语，请先在“展厅导语”页填写。'
          return
        }
        this.commit(() => { segment.hallIntroRef = { introSnapshot: intro.content, linkedAt: new Date().toISOString() } })
        this.notice = '已引用展厅导语，可在下方继续补写本展项内容。'
      } else {
        this.commit(() => {
          // 取消引用时把旧导语并入段落正文，文案不丢失，段落转为独立编辑
          const intro = segment.hallIntroRef?.introSnapshot || ''
          if (intro) segment.content = [intro, segment.content].filter(Boolean).join(draft.languageId === 'zh' ? '' : '\n')
          segment.hallIntroRef = undefined
        })
        this.notice = '已取消引用，导语文本保留在段落内容中，可继续独立编辑。'
      }
    },
    // 确认导语更新：以当前导语替换旧导语快照，段落退出待复核
    confirmSegmentIntro(id: string) {
      const draft = this.selectedDraft
      const exhibit = this.selectedExhibit
      const segment = draft?.segments.find(item => item.id === id)
      if (!draft || !exhibit || !segment?.hallIntroRef || segment.locked) return
      const intro = this.hallIntro(exhibit.hallId, draft.languageId)
      this.commit(() => {
        segment.hallIntroRef = { introSnapshot: intro?.content || '', linkedAt: new Date().toISOString() }
      })
      this.notice = '已确认采用最新展厅导语。'
    },
    // 列出某展厅某语言导语被哪些展项段落引用，供导语页查看同步状态
    hallIntroReferences(hallId: string, languageId: string): HallIntroReferenceRow[] {
      const rows: HallIntroReferenceRow[] = []
      for (const exhibit of this.exhibits.filter(item => item.hallId === hallId).sort((a, b) => a.order - b.order)) {
        const draft = exhibit.drafts.find(item => item.languageId === languageId)
        if (!draft) continue
        for (const segment of draft.segments) {
          if (!segment.hallIntroRef) continue
          rows.push({
            exhibitId: exhibit.id,
            code: exhibit.code,
            exhibitTitle: exhibit.title,
            segmentId: segment.id,
            label: segment.label || '未命名段落',
            locked: segment.locked,
            stale: this.isSegmentStale(segment, hallId, languageId)
          })
        }
      }
      return rows
    },
    setStatus(status: ScriptStatus) {
      const draft = this.selectedDraft
      if (!draft) return
      this.commit(() => { draft.status = status; draft.updatedAt = new Date().toISOString() })
      this.notice = `状态已更新为“${this.statusLabel(status)}”。`
    },
    statusLabel(status: ScriptStatus) {
      return ({ draft: '草稿', review: '待审', returned: '退回', approved: '已定稿' })[status]
    },
    createVersion(name?: string) {
      const draft = this.selectedDraft
      if (!draft) return
      const version: VersionSnapshot = {
        id: `version-${Date.now()}`,
        exhibitId: this.selectedExhibitId,
        languageId: this.selectedLanguageId,
        name: name || `${new Date().toLocaleString('zh-CN', { hour12: false })} 快照`,
        createdAt: new Date().toISOString(),
        draft: JSON.parse(JSON.stringify(draft))
      }
      this.commit(() => this.versions.unshift(version))
      this.notice = '已保存当前版本，可在版本页比较或恢复。'
    },
    restoreVersion(id: string) {
      const version = this.versions.find(item => item.id === id)
      if (!version) return
      this.commit(() => {
        const exhibit = this.exhibits.find(item => item.id === version.exhibitId)
        if (!exhibit) return
        const index = exhibit.drafts.findIndex(item => item.languageId === version.languageId)
        const restored = JSON.parse(JSON.stringify(version.draft)) as LanguageDraft
        if (index >= 0) exhibit.drafts[index] = restored
        else exhibit.drafts.push(restored)
      })
      this.selectedExhibitId = version.exhibitId
      this.selectedLanguageId = version.languageId
      this.notice = '版本已恢复，并作为一次可撤销操作保存。'
    },
    undo() {
      const state = this.past.pop()
      if (!state) return
      this.future.push(this.snapshot())
      this.$patch(normalizeState(JSON.parse(state)))
      this.lastSavedAt = new Date().toISOString()
      this.ensureSelection()
      this.persist()
      this.notice = '已撤销上一步。'
    },
    redo() {
      const state = this.future.pop()
      if (!state) return
      this.past.push(this.snapshot())
      this.$patch(normalizeState(JSON.parse(state)))
      this.lastSavedAt = new Date().toISOString()
      this.ensureSelection()
      this.persist()
      this.notice = '已重做。'
    },
    completionFor(exhibit: Exhibit, languageId: string): number {
      const draft = exhibit.drafts.find(item => item.languageId === languageId)
      if (!draft) return 0
      const checks = [draft.title, draft.narration, draft.accessibility, draft.sources, draft.segments.length > 0 ? 'segments' : '']
      return Math.round(checks.filter(Boolean).length / checks.length * 100)
    }
  }
})
