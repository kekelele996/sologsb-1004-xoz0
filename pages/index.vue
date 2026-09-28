<script setup lang="ts">
import type { DeviceKind, DiffLine, IntroState, IntroUsage, LanguageDraft, ScriptStatus, Segment } from '~/types'
import { LANGUAGES, useScriptStore } from '~/stores/script'

const store = useScriptStore()
const activeTab = ref('editor')
const device = ref<DeviceKind>('desktop')
const versionDialog = ref(false)
const versionName = ref('')
const leftFilter = ref('')
const compareA = ref('')
const compareB = ref('')
const helpDialog = ref(false)
const deleteTarget = ref<string | null>(null)
const introDraftText = ref('')

const statusOptions: Array<{ value: ScriptStatus; label: string; color: string }> = [
  { value: 'draft', label: '草稿', color: 'grey' },
  { value: 'review', label: '待审', color: 'warning' },
  { value: 'returned', label: '退回', color: 'error' },
  { value: 'approved', label: '已定稿', color: 'success' }
]
const deviceOptions: Array<{ value: DeviceKind; label: string }> = [
  { value: 'desktop', label: '桌面大屏' },
  { value: 'tablet', label: '平板导览' },
  { value: 'mobile', label: '手机导览' },
  { value: 'kiosk', label: '馆内触摸屏' }
]

const draft = computed(() => store.selectedDraft)
const exhibit = computed(() => store.selectedExhibit)
const currentLanguage = computed(() => LANGUAGES.find(item => item.id === store.selectedLanguageId))
const currentStatus = computed(() => statusOptions.find(item => item.value === draft.value?.status) || statusOptions[0])
const filteredExhibits = computed(() => store.hallExhibits.filter(item => !leftFilter.value || `${item.code} ${item.title}`.toLowerCase().includes(leftFilter.value.toLowerCase())))
const versions = computed(() => store.versions.filter(item => item.exhibitId === store.selectedExhibitId && item.languageId === store.selectedLanguageId))
const selectedVersionA = computed(() => versions.value.find(item => item.id === compareA.value))
const selectedVersionB = computed(() => versions.value.find(item => item.id === compareB.value))
const diffLines = computed<DiffLine[]>(() => {
  const before = selectedVersionA.value?.draft.narration || ''
  const after = selectedVersionB.value?.draft.narration || ''
  return buildDiff(before, after)
})

const currentHallIntro = computed(() => store.findHallIntro(store.selectedHallId, store.selectedLanguageId))
const introUsages = computed<IntroUsage[]>(() => store.introUsages(store.selectedHallId, store.selectedLanguageId))
const pendingUsages = computed<IntroUsage[]>(() => store.pendingUsages(store.selectedHallId, store.selectedLanguageId))
const hallPendingCount = computed(() => pendingUsages.value.length)
const exhibitPendingCount = computed(() => store.pendingCountForExhibit(store.selectedExhibitId || ''))
const introDirty = computed(() => introDraftText.value !== (currentHallIntro.value?.content ?? ''))
const introHasContent = computed(() => Boolean(currentHallIntro.value?.content?.trim()))

onMounted(() => {
  store.hydrate()
  syncCompareSelection()
  syncIntroDraft()
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
watch(versions, syncCompareSelection)
watch(() => [store.selectedHallId, store.selectedLanguageId], syncIntroDraft)

function syncIntroDraft() {
  introDraftText.value = store.hallIntroContent(store.selectedHallId, store.selectedLanguageId)
}
function saveHallIntro() {
  store.updateHallIntro(store.selectedHallId, store.selectedLanguageId, introDraftText.value)
}
function introState(segment: Segment): IntroState {
  return store.introState(segment, store.selectedHallId, segment.introRef?.languageId || store.selectedLanguageId)
}
function segmentParagraph(segment: Segment): string {
  return store.paragraphOf(segment, store.selectedLanguageId)
}
function stateMeta(state: IntroState) {
  return {
    none: { label: '', color: '', icon: '' },
    missing: { label: '导语缺失', color: 'error', icon: 'mdi-link-off' },
    synced: { label: '已引用导语', color: 'secondary', icon: 'mdi-link-variant' },
    pending: { label: '待复核', color: 'warning', icon: 'mdi-alert-circle-outline' }
  }[state]
}
function goToUsage(usage: IntroUsage) {
  store.selectExhibit(usage.exhibit.id)
  store.selectLanguage(usage.draft.languageId)
  activeTab.value = 'editor'
}
function canAttach(segment: Segment): boolean {
  return Boolean(store.hallIntroContent(store.selectedHallId, store.selectedLanguageId).trim()) && !segment.locked && !segment.introRef
}

function syncCompareSelection() {
  if (!versions.value.some(item => item.id === compareA.value)) compareA.value = versions.value[1]?.id || versions.value[0]?.id || ''
  if (!versions.value.some(item => item.id === compareB.value)) compareB.value = versions.value[0]?.id || ''
}
function handleKeydown(event: KeyboardEvent) {
  const modifier = event.metaKey || event.ctrlKey
  if (!modifier) return
  if (event.key.toLowerCase() === 'z') {
    event.preventDefault()
    event.shiftKey ? store.redo() : store.undo()
  }
  if (event.key.toLowerCase() === 'y') {
    event.preventDefault()
    store.redo()
  }
  if (event.key.toLowerCase() === 's') {
    event.preventDefault()
    store.createVersion('键盘快捷保存')
  }
}
function saveDraftField(field: 'title' | 'narration' | 'accessibility' | 'durationMinutes' | 'sources', event: Event) {
  const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value
  store.updateDraft({ [field]: field === 'durationMinutes' ? Number(value) : value } as Partial<LanguageDraft>)
}
function saveSegment(id: string, field: 'label' | 'content', event: Event) {
  store.updateSegment(id, { [field]: (event.target as HTMLInputElement | HTMLTextAreaElement).value })
}
function submitVersion() {
  store.createVersion(versionName.value.trim() || undefined)
  versionName.value = ''
  versionDialog.value = false
}
function confirmDelete() {
  if (deleteTarget.value) store.removeSegment(deleteTarget.value)
  deleteTarget.value = null
}
function buildDiff(before: string, after: string): DiffLine[] {
  const a = before.split(/(?<=[。！？.!?])\s*/).filter(Boolean)
  const b = after.split(/(?<=[。！？.!?])\s*/).filter(Boolean)
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1])
  }
  const result: DiffLine[] = []
  let i = 0, j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { result.push({ type: 'same', text: a[i] }); i++; j++ }
    else if (rows[i + 1][j] >= rows[i][j + 1]) { result.push({ type: 'remove', text: a[i] }); i++ }
    else { result.push({ type: 'add', text: b[j] }); j++ }
  }
  while (i < a.length) result.push({ type: 'remove', text: a[i++] })
  while (j < b.length) result.push({ type: 'add', text: b[j++] })
  return result
}
function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}
function segmentLabel(segment: Segment) { return segment.label || '未命名段落' }
</script>

<template>
  <v-app class="workspace-shell">
    <a class="skip-link" href="#main-workspace">跳到主要内容</a>
    <v-app-bar color="surface" flat border>
      <template #prepend><v-app-bar-nav-icon aria-label="打开项目导航" /></template>
      <v-app-bar-title>
        <span class="project-mark">博物声</span>
        <span class="text-caption text-medium-emphasis ms-3 d-none d-md-inline">展陈脚本工作台</span>
      </v-app-bar-title>
      <v-spacer />
      <v-chip class="me-2 d-none d-sm-flex" :color="currentStatus.color" variant="tonal" size="small">
        <span class="status-dot" :style="{ background: 'currentColor' }" />{{ currentStatus.label }}
      </v-chip>
      <v-btn variant="text" prepend-icon="mdi-keyboard-outline" class="d-none d-md-flex" @click="helpDialog = true">快捷键</v-btn>
      <v-btn color="primary" prepend-icon="mdi-content-save-outline" @click="versionDialog = true">保存版本</v-btn>
    </v-app-bar>

    <v-navigation-drawer permanent width="320" color="surface" border>
      <div class="pa-4">
        <div class="section-title mb-2">展厅</div>
        <v-select
          :model-value="store.selectedHallId"
          :items="store.halls"
          item-title="name"
          item-value="id"
          hide-details
          aria-label="选择展厅"
          @update:model-value="store.selectHall"
        />
        <div class="d-flex align-center justify-space-between mt-5 mb-2">
          <div class="section-title">展项</div>
          <v-chip size="x-small" variant="tonal">{{ filteredExhibits.length }} 项</v-chip>
        </div>
        <v-text-field v-model="leftFilter" density="compact" hide-details prepend-inner-icon="mdi-magnify" placeholder="筛选展项" aria-label="筛选展项" />
        <v-list class="mt-2 bg-transparent" nav>
          <v-list-item
            v-for="item in filteredExhibits"
            :key="item.id"
            :active="item.id === store.selectedExhibitId"
            color="primary"
            rounded="lg"
            @click="store.selectExhibit(item.id)"
          >
            <template #prepend><v-chip size="small" variant="outlined">{{ item.code }}</v-chip></template>
            <v-list-item-title class="font-weight-medium">{{ item.title }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ item.drafts.length }} 种语言
              <v-chip v-if="store.pendingCountForExhibit(item.id)" class="ms-1" size="x-small" color="warning" variant="tonal" :aria-label="`${store.pendingCountForExhibit(item.id)} 段导语待复核`">
                {{ store.pendingCountForExhibit(item.id) }} 段待复核
              </v-chip>
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
      <v-divider />
      <div class="pa-4">
        <div class="section-title mb-3">多语言完成度</div>
        <div v-for="lang in LANGUAGES" :key="lang.id" class="mb-3">
          <button class="d-flex align-center w-100 border-0 bg-transparent text-left pa-0" :aria-pressed="lang.id === store.selectedLanguageId" @click="store.selectLanguage(lang.id)">
            <v-avatar size="32" :color="lang.id === store.selectedLanguageId ? 'primary' : 'grey-lighten-2'" :class="lang.id === store.selectedLanguageId ? 'text-white' : ''">{{ lang.shortLabel }}</v-avatar>
            <div class="ms-3 flex-grow-1">
              <div class="text-body-2 font-weight-medium">{{ lang.label }}</div>
              <v-progress-linear class="mt-1" :model-value="exhibit ? store.completionFor(exhibit, lang.id) : 0" :color="lang.id === store.selectedLanguageId ? 'primary' : 'secondary'" height="5" rounded />
            </div>
            <span class="text-caption ms-3">{{ exhibit ? store.completionFor(exhibit, lang.id) : 0 }}%</span>
          </button>
        </div>
      </div>
    </v-navigation-drawer>

    <v-main id="main-workspace" style="background:#f4f0e8">
      <div class="pa-3 pa-md-6">
        <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-5">
          <div>
            <div class="text-caption text-medium-emphasis mb-1">{{ store.selectedHall?.name }} / {{ exhibit?.code }}</div>
            <h1 class="text-h4 font-weight-bold project-mark">{{ exhibit?.title || '请选择展项' }}</h1>
            <div class="text-body-2 text-medium-emphasis mt-2">
              当前语言：{{ currentLanguage?.label }} ·
              {{ draft?.updatedAt ? `最后更新 ${formatTime(draft.updatedAt)}` : '尚未建立文稿' }}
            </div>
          </div>
          <div class="d-flex ga-2">
            <v-btn variant="outlined" prepend-icon="mdi-undo" :disabled="!store.canUndo" @click="store.undo">撤销</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-redo" :disabled="!store.canRedo" @click="store.redo">重做</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-history" @click="activeTab = 'versions'">版本</v-btn>
          </div>
        </div>

        <v-alert v-if="store.notice" class="mb-4" color="secondary" variant="tonal" closable @click:close="store.notice = ''">{{ store.notice }}</v-alert>

        <v-tabs v-model="activeTab" color="primary" bg-color="surface" rounded="lg" class="mb-4 px-2">
          <v-tab value="editor">脚本编辑</v-tab>
          <v-tab value="intros">
            展厅导语
            <v-chip v-if="hallPendingCount" class="ms-2" size="x-small" color="warning" variant="flat">{{ hallPendingCount }} 待复核</v-chip>
          </v-tab>
          <v-tab value="versions">版本比较</v-tab>
          <v-tab value="preview">设备预览</v-tab>
          <v-tab value="sources">资料核对</v-tab>
        </v-tabs>

        <div v-if="draft">
          <v-window v-model="activeTab" :touch="false">
            <v-window-item value="editor">
              <v-row>
                <v-col cols="12" lg="8">
                  <v-card class="script-card pa-4 pa-md-6">
                    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                      <div>
                        <div class="section-title">当前文稿</div>
                        <div class="text-h6 font-weight-bold mt-1">{{ currentLanguage?.label }}</div>
                      </div>
                      <div class="d-flex flex-wrap ga-2">
                        <v-select
                          :model-value="draft.status"
                          :items="statusOptions"
                          item-title="label"
                          item-value="value"
                          label="审校状态"
                          hide-details
                          style="min-width:150px"
                          @update:model-value="store.setStatus"
                        />
                        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="store.addSegment">新增段落</v-btn>
                      </div>
                    </div>

                    <v-text-field label="展项标题" :model-value="draft.title" hint="面向观众的主标题" persistent-hint @change="saveDraftField('title', $event)" />
                    <v-row class="mt-2">
                      <v-col cols="12" md="5">
                        <v-text-field label="预计朗读时长（分钟）" type="number" min="0" step="0.5" :model-value="draft.durationMinutes" @change="saveDraftField('durationMinutes', $event)" />
                      </v-col>
                      <v-col cols="12" md="7">
                        <v-text-field label="资料来源" :model-value="draft.sources" hint="书籍、档案号或专家核验记录" persistent-hint @change="saveDraftField('sources', $event)" />
                      </v-col>
                    </v-row>

                    <div class="section-title mt-6 mb-2">完整讲解词</div>
                    <v-textarea label="讲解词" rows="7" auto-grow counter :model-value="draft.narration" @change="saveDraftField('narration', $event)" />

                    <div class="section-title mt-6 mb-2">无障碍描述</div>
                    <v-textarea label="无障碍描述" rows="4" auto-grow hint="描述尺寸、材质、色彩与可触摸特征，避免只依赖视觉" persistent-hint :model-value="draft.accessibility" @change="saveDraftField('accessibility', $event)" />
                  </v-card>

                  <v-card class="script-card pa-4 pa-md-6 mt-5">
                    <div class="d-flex align-center justify-space-between mb-4">
                      <div>
                        <div class="section-title">分段校对</div>
                        <div class="text-body-2 text-medium-emphasis mt-1">锁定段落不会被编辑；可在撤销中恢复。</div>
                      </div>
                      <v-chip variant="tonal">{{ draft.segments.filter(item => item.locked).length }}/{{ draft.segments.length }} 已锁定</v-chip>
                    </div>
                    <div class="d-flex flex-column ga-3">
                      <div
                        v-for="(segment, index) in draft.segments"
                        :key="segment.id"
                        class="segment-row"
                        :class="{ locked: segment.locked, pending: introState(segment) === 'pending' }"
                      >
                        <div class="d-flex flex-wrap align-center ga-2">
                          <v-btn icon size="small" variant="text" :aria-label="segment.locked ? '解锁段落' : '锁定段落'" @click="store.toggleLock(segment.id)">
                            {{ segment.locked ? '🔒' : '🔓' }}
                          </v-btn>
                          <v-text-field :model-value="segment.label" density="compact" hide-details variant="plain" :readonly="segment.locked" :aria-label="`第 ${index + 1} 段标题`" @change="saveSegment(segment.id, 'label', $event)" />
                          <v-chip v-if="introState(segment) !== 'none'" :color="stateMeta(introState(segment)).color" size="small" variant="tonal" :prepend-icon="stateMeta(introState(segment)).icon">{{ stateMeta(introState(segment)).label }}</v-chip>
                          <v-chip v-if="segment.locked" color="success" size="small" variant="tonal">已确认</v-chip>
                          <v-spacer />
                          <v-tooltip v-if="!segment.introRef && !introHasContent" :disabled="segment.locked" text="请先在“展厅导语”中撰写当前语言的导语">
                            <template #activator="{ props }">
                              <span v-bind="props" class="d-inline-flex">
                                <v-btn size="small" variant="tonal" prepend-icon="mdi-link-variant-plus" disabled>引用导语</v-btn>
                              </span>
                            </template>
                          </v-tooltip>
                          <v-btn v-else-if="!segment.introRef" size="small" variant="tonal" prepend-icon="mdi-link-variant-plus" :disabled="!canAttach(segment)" @click="store.attachIntroRef(store.selectedExhibitId!, store.selectedLanguageId, segment.id)">引用导语</v-btn>
                          <v-btn v-if="segment.introRef" size="small" variant="text" color="secondary" prepend-icon="mdi-link-off" :disabled="segment.locked" @click="store.detachIntroRef(store.selectedExhibitId!, store.selectedLanguageId, segment.id)">取消引用</v-btn>
                          <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" :disabled="segment.locked" :aria-label="`删除第 ${index + 1} 段`" @click="deleteTarget = segment.id" />
                        </div>

                        <template v-if="segment.introRef">
                          <v-alert
                            v-if="introState(segment) === 'pending'"
                            class="mt-3 intro-pending-alert"
                            color="warning"
                            variant="tonal"
                            density="compact"
                            role="status"
                            title="展厅导语已更新，本段待复核"
                            text="确认前仍播放下方旧导语；核对无误后采用新导语。"
                          />
                          <div class="intro-block" :class="{ 'intro-stale': introState(segment) === 'pending' }">
                            <div class="intro-block-head">
                              <v-icon size="small" :icon="introState(segment) === 'pending' ? 'mdi-history' : 'mdi-link-variant'" />
                              <span>{{ introState(segment) === 'pending' ? '当前使用的旧导语' : '展厅导语' }}</span>
                            </div>
                            <p class="intro-block-text">{{ segment.introRef.syncedContent }}</p>
                          </div>
                          <div v-if="introState(segment) === 'pending'" class="intro-block intro-new mt-2">
                            <div class="intro-block-head">
                              <v-icon size="small" icon="mdi-new-box" />
                              <span>待确认的新导语</span>
                            </div>
                            <p class="intro-block-text">{{ store.hallIntroContent(store.selectedHallId, segment.introRef.languageId) }}</p>
                            <div class="d-flex flex-wrap ga-2 mt-2">
                              <v-btn size="small" color="primary" variant="tonal" prepend-icon="mdi-check" :disabled="segment.locked" @click="store.acceptIntroRef(store.selectedExhibitId!, store.selectedLanguageId, segment.id)">采用新导语</v-btn>
                              <span v-if="segment.locked" class="text-caption text-medium-emphasis align-self-center">段落已锁定，解锁后才能确认。</span>
                            </div>
                          </div>
                          <v-textarea
                            class="mt-2"
                            :model-value="segment.content"
                            rows="2"
                            auto-grow
                            hide-details
                            :readonly="segment.locked"
                            placeholder="在导语之后补写本展项专属内容（可留空）"
                            :aria-label="`${segmentLabel(segment)}：本展项补写内容`"
                            @change="saveSegment(segment.id, 'content', $event)"
                          />
                        </template>
                        <v-textarea v-else class="mt-2" :model-value="segment.content" rows="2" auto-grow hide-details :readonly="segment.locked" :aria-label="segmentLabel(segment)" @change="saveSegment(segment.id, 'content', $event)" />
                      </div>
                    </div>
                  </v-card>
                </v-col>

                <v-col cols="12" lg="4">
                  <v-card class="script-card pa-5">
                    <div class="section-title mb-4">同展项语言进度</div>
                    <div v-for="lang in LANGUAGES" :key="lang.id" class="d-flex align-center ga-3 mb-4">
                      <v-progress-circular :model-value="store.completionFor(exhibit!, lang.id)" size="52" width="5" :color="lang.id === store.selectedLanguageId ? 'primary' : 'secondary'">
                        {{ store.completionFor(exhibit!, lang.id) }}
                      </v-progress-circular>
                      <div class="flex-grow-1">
                        <div class="font-weight-medium">{{ lang.label }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ exhibit?.drafts.find(item => item.languageId === lang.id) ? store.statusLabel(exhibit!.drafts.find(item => item.languageId === lang.id)!.status) : '尚未创建' }}
                        </div>
                      </div>
                      <v-btn size="small" variant="text" :disabled="lang.id === store.selectedLanguageId" @click="store.selectLanguage(lang.id)">切换</v-btn>
                    </div>
                  </v-card>
                  <v-card class="script-card pa-5 mt-5">
                    <div class="section-title mb-3">审校检查</div>
                    <v-list density="compact" class="bg-transparent">
                      <v-list-item :prepend-icon="draft.narration.length > 80 ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="`讲解词 ${draft.narration.length} 字`" />
                      <v-list-item :prepend-icon="draft.accessibility.length > 30 ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="`无障碍描述 ${draft.accessibility.length} 字`" />
                      <v-list-item :prepend-icon="draft.sources ? 'mdi-check-circle' : 'mdi-alert-circle'" :title="draft.sources ? '资料来源已填写' : '缺少资料来源'" />
                      <v-list-item
                        :prepend-icon="exhibitPendingCount ? 'mdi-alert-circle' : 'mdi-check-circle'"
                        :title="exhibitPendingCount ? `${exhibitPendingCount} 段导语待复核` : '引用导语均为最新'"
                        :style="exhibitPendingCount ? 'cursor:pointer;color:#9a5b00' : ''"
                        @click="exhibitPendingCount && (activeTab = 'intros')"
                      />
                    </v-list>
                    <v-alert class="mt-3" type="info" variant="tonal" density="compact">
                      估算语速约 {{ Math.max(1, Math.round(draft.narration.length / 220 * 10) / 10) }} 分钟，请与目标时长核对。
                    </v-alert>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="intros">
              <v-row>
                <v-col cols="12" md="7">
                  <v-card class="script-card pa-4 pa-md-6">
                    <div class="d-flex flex-wrap align-start justify-space-between ga-3 mb-4">
                      <div>
                        <div class="section-title">展厅公共导语</div>
                        <div class="text-h6 font-weight-bold mt-1">{{ store.selectedHall?.name }} · {{ currentLanguage?.label }}</div>
                        <div class="text-body-2 text-medium-emphasis mt-1">同一条导语可被本展厅多个展项段落引用；改词后引用段落进入待复核，确认前保留旧导语。</div>
                      </div>
                      <v-btn-toggle v-model="store.selectedLanguageId" mandatory variant="outlined" divided density="compact" @update:model-value="store.selectLanguage(String($event))">
                        <v-btn v-for="lang in LANGUAGES" :key="lang.id" :value="lang.id" size="small">{{ lang.shortLabel }}</v-btn>
                      </v-btn-toggle>
                    </div>
                    <v-textarea
                      v-model="introDraftText"
                      :label="`${currentLanguage?.label}导语`"
                      rows="7"
                      auto-grow
                      counter
                      placeholder="撰写本展厅面向观众的公共导语，例如展厅定位与参观提示；展项段落可直接引用。"
                    />
                    <div class="d-flex flex-wrap align-center ga-3 mt-3">
                      <v-btn color="primary" prepend-icon="mdi-content-save-outline" :disabled="!introDirty" @click="saveHallIntro">保存导语</v-btn>
                      <span class="text-caption text-medium-emphasis">
                        {{ currentHallIntro ? `导语最后更新 ${formatTime(currentHallIntro.updatedAt)}` : '这一语言尚未撰写导语' }}
                      </span>
                    </div>
                  </v-card>
                </v-col>
                <v-col cols="12" md="5">
                  <v-card class="script-card pa-5">
                    <div class="d-flex align-center justify-space-between mb-3">
                      <div class="section-title">引用情况</div>
                      <v-chip :color="hallPendingCount ? 'warning' : 'success'" size="small" variant="tonal">{{ hallPendingCount ? `${hallPendingCount} 段待复核` : '全部最新' }}</v-chip>
                    </div>
                    <v-alert v-if="hallPendingCount" type="warning" variant="tonal" density="compact" class="mb-3">
                      <div class="d-flex align-center justify-space-between ga-2">
                        <span>有 {{ hallPendingCount }} 个引用段落仍在使用旧导语。</span>
                        <v-btn size="small" variant="text" color="warning" @click="store.acceptAllHallIntros(store.selectedHallId, store.selectedLanguageId)">全部确认</v-btn>
                      </div>
                      <div class="text-caption mt-1">已锁定的段落需先解锁，确认操作不会代替人工复核。</div>
                    </v-alert>
                    <v-list v-if="introUsages.length" density="compact" class="bg-transparent">
                      <v-list-item v-for="usage in introUsages" :key="usage.segment.id" :class="{ 'usage-pending': store.introState(usage.segment, store.selectedHallId, store.selectedLanguageId) === 'pending' }">
                        <template #prepend>
                          <v-icon :icon="store.introState(usage.segment, store.selectedHallId, store.selectedLanguageId) === 'pending' ? 'mdi-alert-circle-outline' : 'mdi-link-variant'" :color="store.introState(usage.segment, store.selectedHallId, store.selectedLanguageId) === 'pending' ? 'warning' : 'secondary'" />
                        </template>
                        <v-list-item-title>
                          <span class="font-weight-medium">{{ usage.exhibit.code }} · {{ usage.segment.label }}</span>
                          <v-chip v-if="store.introState(usage.segment, store.selectedHallId, store.selectedLanguageId) === 'pending'" class="ms-2" size="x-small" color="warning" variant="tonal">待复核</v-chip>
                        </v-list-item-title>
                        <v-list-item-subtitle>{{ usage.exhibit.title }}</v-list-item-subtitle>
                        <template #append>
                          <v-btn size="small" variant="text" @click="goToUsage(usage)">去{{ store.introState(usage.segment, store.selectedHallId, store.selectedLanguageId) === 'pending' ? '确认' : '查看' }}</v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                    <v-alert v-else type="info" variant="tonal" density="compact" text="本展厅还没有展项段落引用这一语言的导语；保存导语后可在段落编辑中点击“引用导语”。" />
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="versions">
              <v-card class="script-card pa-4 pa-md-6">
                <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                  <div>
                    <div class="section-title">版本比较</div>
                    <div class="text-h6 font-weight-bold mt-1">选择同一展项、同一语言的两个快照</div>
                  </div>
                  <v-btn color="primary" prepend-icon="mdi-content-save-plus-outline" @click="versionDialog = true">保存当前版本</v-btn>
                </div>
                <v-alert v-if="versions.length < 2" type="info" variant="tonal">至少保存两个版本后即可比较。当前有 {{ versions.length }} 个版本。</v-alert>
                <template v-else>
                  <v-row>
                    <v-col cols="12" md="6"><v-select v-model="compareA" :items="versions" item-title="name" item-value="id" label="基准版本" /></v-col>
                    <v-col cols="12" md="6"><v-select v-model="compareB" :items="versions" item-title="name" item-value="id" label="目标版本" /></v-col>
                  </v-row>
                  <div class="d-flex ga-4 text-caption text-medium-emphasis mb-2">
                    <span><span class="status-dot" style="background:#9b2c25" /> 删除</span>
                    <span><span class="status-dot" style="background:#2f6b45" /> 新增</span>
                  </div>
                  <div class="rounded-lg border pa-3 bg-white">
                    <p v-for="(line, index) in diffLines" :key="index" class="diff-line" :class="`diff-${line.type}`">{{ line.text }}</p>
                    <div v-if="!diffLines.length" class="text-medium-emphasis pa-4">所选版本内容一致。</div>
                  </div>
                  <v-list class="mt-4 bg-transparent">
                    <v-list-item v-for="version in versions" :key="version.id" :title="version.name" :subtitle="formatTime(version.createdAt)">
                      <template #append><v-btn variant="outlined" size="small" @click="store.restoreVersion(version.id)">恢复此版</v-btn></template>
                    </v-list-item>
                  </v-list>
                </template>
              </v-card>
            </v-window-item>

            <v-window-item value="preview">
              <v-card class="script-card pa-4 pa-md-6">
                <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-5">
                  <div>
                    <div class="section-title">设备排版预览</div>
                    <div class="text-h6 font-weight-bold mt-1">以展项实际阅读顺序预览</div>
                  </div>
                  <v-btn-toggle v-model="device" mandatory variant="outlined" divided>
                    <v-btn v-for="item in deviceOptions" :key="item.value" :value="item.value">{{ item.label }}</v-btn>
                  </v-btn-toggle>
                </div>
                <div class="preview-frame" :class="device">
                  <div class="preview-content">
                    <div class="text-overline text-medium-emphasis">{{ exhibit?.code }} · {{ currentLanguage?.label }}</div>
                    <h2 class="text-h4 font-weight-bold mt-2">{{ draft.title }}</h2>
                    <p class="text-body-1 mt-6" style="line-height:1.9;white-space:pre-wrap">{{ draft.narration }}</p>
                    <v-divider class="my-6" />
                    <div class="section-title">无障碍描述</div>
                    <p class="text-body-2 mt-2" style="line-height:1.8;white-space:pre-wrap">{{ draft.accessibility }}</p>
                    <v-divider class="my-6" />
                    <div class="section-title">讲解分段</div>
                    <div v-for="(segment, index) in draft.segments" :key="segment.id" class="mt-3">
                      <div class="d-flex align-center ga-2">
                        <span class="text-caption text-medium-emphasis">{{ index + 1 }}. {{ segment.label }}</span>
                        <v-chip v-if="introState(segment) === 'pending'" size="x-small" color="warning" variant="tonal">导语待复核 · 预览为旧导语</v-chip>
                      </div>
                      <p class="text-body-2 mt-1" style="line-height:1.8;white-space:pre-wrap">{{ segmentParagraph(segment) }}</p>
                    </div>
                    <div class="mt-7 text-caption text-medium-emphasis">预计讲解 {{ draft.durationMinutes }} 分钟</div>
                  </div>
                </div>
              </v-card>
            </v-window-item>

            <v-window-item value="sources">
              <v-row>
                <v-col cols="12" md="7">
                  <v-card class="script-card pa-5">
                    <div class="section-title mb-3">来源与核验记录</div>
                    <v-textarea :model-value="draft.sources" rows="8" @change="saveDraftField('sources', $event)" />
                    <v-alert class="mt-4" type="warning" variant="tonal">发布前请由内容负责人逐条核对来源。当前无障碍描述与实物尺寸需由教育部门复核。</v-alert>
                  </v-card>
                </v-col>
                <v-col cols="12" md="5">
                  <v-card class="script-card pa-5">
                    <div class="section-title mb-3">段落锁定概况</div>
                    <v-timeline density="compact" side="end">
                      <v-timeline-item v-for="segment in draft.segments" :key="segment.id" :dot-color="segment.locked ? 'success' : 'grey'" size="small">
                        <div class="font-weight-medium">{{ segment.label }}</div>
                        <div class="text-caption text-medium-emphasis">{{ segment.locked ? '已锁定，审校确认' : '编辑中' }}</div>
                      </v-timeline-item>
                    </v-timeline>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>
          </v-window>
        </div>
        <v-empty-state v-else icon="mdi-script-text-outline" title="尚未选择展项" text="请从左侧选择一个展厅和展项。" />
      </div>
    </v-main>

    <v-dialog v-model="versionDialog" max-width="520">
      <v-card class="pa-3">
        <v-card-title>保存版本快照</v-card-title>
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">将当前“{{ draft?.title }}”的完整内容和锁定状态保存为只读版本。</p>
          <v-text-field v-model="versionName" label="版本名称（可选）" autofocus @keyup.enter="submitVersion" />
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="versionDialog = false">取消</v-btn><v-btn color="primary" @click="submitVersion">保存快照</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog :model-value="Boolean(deleteTarget)" max-width="440" @update:model-value="deleteTarget = null">
      <v-card class="pa-3">
        <v-card-title>删除这个段落？</v-card-title>
        <v-card-text>删除后可使用撤销恢复。</v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="deleteTarget = null">取消</v-btn><v-btn color="error" @click="confirmDelete">删除</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="helpDialog" max-width="520">
      <v-card class="pa-3">
        <v-card-title>键盘操作</v-card-title>
        <v-card-text>
          <v-list>
            <v-list-item prepend-icon="mdi-apple-keyboard-command" title="Ctrl / ⌘ + Z" subtitle="撤销上一步编辑" />
            <v-list-item prepend-icon="mdi-redo" title="Ctrl / ⌘ + Shift + Z" subtitle="重做" />
            <v-list-item prepend-icon="mdi-content-save-outline" title="Ctrl / ⌘ + S" subtitle="保存当前版本快照" />
            <v-list-item prepend-icon="mdi-keyboard-tab" title="Tab / Shift + Tab" subtitle="在字段、状态与段落操作之间移动" />
          </v-list>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn color="primary" @click="helpDialog = false">知道了</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar :model-value="Boolean(store.notice)" timeout="2600" location="bottom right" @update:model-value="store.notice = ''">
      {{ store.notice }}
      <template #actions><v-btn variant="text" @click="store.notice = ''">关闭</v-btn></template>
    </v-snackbar>
  </v-app>
</template>
