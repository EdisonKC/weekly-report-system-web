<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">REPORT REVIEW</span>
        <h1>周报审阅</h1>
        <p>查看团队成员的周报，为每份周报填写本周完成情况评价。</p>
      </div>
      <div class="heading-actions">
        <el-button
          type="primary"
          :loading="exporting"
          :disabled="!selectedPeriodId || !selectedPeriod?.submittedCount"
          @click="exportExcel"
        >
          <Download /> 导出 Excel
        </el-button>
      </div>
    </div>

    <section class="app-card filter-card">
      <div class="filter-row">
        <div class="filter-block period-filter">
          <span class="filter-label">周报周期</span>
          <el-select v-model="selectedPeriodId" placeholder="选择周报周期" @change="changePeriod">
            <el-option v-for="period in periods" :key="period.id" :label="`${period.title} · ${phaseOf(period).label}`" :value="period.id" />
          </el-select>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-block status-filter">
          <span class="filter-label">提交状态</span>
          <div class="status-tabs">
            <button
              v-for="tab in statusTabs"
              :key="tab.value"
              class="status-tab"
              :class="{ active: statusFilter === tab.value }"
              @click="statusFilter = tab.value"
            >
              {{ tab.label }}
              <span>{{ countByStatus(tab.value) }}</span>
            </button>
          </div>
        </div>
        <div class="filter-block search-filter">
          <el-input v-model="keyword" placeholder="搜索姓名或账号" clearable>
            <template #prefix><Search /></template>
          </el-input>
        </div>
      </div>
    </section>

    <div class="review-summary">
      <div class="summary-chip">
        <span class="summary-dot green"></span>
        <strong>{{ selectedPeriod?.submittedCount || 0 }}</strong>
        <span>已提交</span>
      </div>
      <div class="summary-chip">
        <span class="summary-dot amber"></span>
        <strong>{{ countByStatus('DRAFT') }}</strong>
        <span>草稿</span>
      </div>
      <div class="summary-chip">
        <span class="summary-dot gray"></span>
        <strong>{{ countByStatus('NOT_STARTED') }}</strong>
        <span>未填写</span>
      </div>
      <div class="summary-chip highlight">
        <EditPen />
        <strong>{{ pendingCount }}</strong>
        <span>待评价</span>
      </div>
      <div v-if="selectedPeriod" class="summary-period">
        <Calendar />
        <span>填写截止 {{ formatDateTime(selectedPeriod.fillEnd) }}</span>
      </div>
    </div>

    <section class="app-card table-card">
      <el-table v-loading="loading" :data="filteredReports" row-key="userId" class="report-table">
        <el-table-column label="员工" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar-chip">{{ initialOf(row.userName) }}</div>
              <div>
                <div class="user-name">{{ row.userName }}</div>
                <div class="user-account">@{{ row.account }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="102">
          <template #default="{ row }">
            <span class="status-pill" :class="reportStatusOf(row.status).className">
              {{ reportStatusOf(row.status).label }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="148">
          <template #default="{ row }">
            <span class="time-text">{{ row.submittedAt ? formatDateTime(row.submittedAt) : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="工作项" width="88">
          <template #default="{ row }">
            <span class="count-text">{{ row.itemCount }} 项</span>
          </template>
        </el-table-column>
        <el-table-column label="工作时长" width="92">
          <template #default="{ row }">
            <span class="count-text">{{ row.totalDays }} 天</span>
          </template>
        </el-table-column>
        <el-table-column label="完成进度" width="110">
          <template #default="{ row }">
            <span class="progress-text">{{ row.averageProgress }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="完成情况评价" min-width="220">
          <template #default="{ row }">
            <div v-if="row.evaluation" class="evaluation-text" :title="row.evaluation">{{ briefEvaluation(row.evaluation) }}</div>
            <span v-else-if="row.status === 'SUBMITTED'" class="pending-tag">待评价</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="112" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'NOT_STARTED'"
              text
              type="primary"
              @click="openDetail(row)"
            >
              <View /> {{ row.status === 'SUBMITTED' ? '审阅' : '查看' }}
            </el-button>
            <span v-else class="not-submit-text">尚未提交</span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon"><DocumentChecked /></div>
            <strong>当前条件下没有周报</strong>
            <span>切换周期或调整筛选条件后再试试。</span>
          </div>
        </template>
      </el-table>
      <div v-if="filteredReports.length" class="table-foot">
        <span>共 {{ filteredReports.length }} 位成员</span>
        <span>已评价 {{ evaluatedCount }} / 已提交 {{ selectedPeriod?.submittedCount || 0 }}</span>
      </div>
    </section>

    <el-drawer v-model="drawerVisible" :size="drawerSize" class="report-drawer" append-to-body destroy-on-close>
      <template #header>
        <div v-if="activeDetail" class="drawer-title">
          <div class="avatar-chip large">{{ initialOf(activeDetail.userName) }}</div>
          <div class="drawer-title-copy">
            <div class="drawer-name-row">
              <strong>{{ activeDetail.userName }}</strong>
              <span class="status-pill" :class="reportStatusOf(activeDetail.status).className">
                {{ reportStatusOf(activeDetail.status).label }}
              </span>
            </div>
            <span>{{ activeDetail.periodTitle }} · {{ formatDateTime(activeDetail.submittedAt) }} 提交</span>
          </div>
        </div>
        <div v-else class="drawer-title"><strong>周报详情</strong></div>
      </template>

      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="activeDetail">
          <section class="detail-block plan-block">
            <div class="detail-section-title"><span>01</span> 上周工作计划</div>
            <p class="detail-text">{{ activeDetail.lastWeekPlan || '—' }}</p>
          </section>

          <section class="detail-block">
            <div class="detail-section-title">
              <span>02</span> 本周工作内容
              <em>{{ activeDetail.items?.length || 0 }} 项</em>
            </div>
            <div class="detail-items">
              <article v-for="(item, index) in activeDetail.items" :key="item.id || index" class="detail-item">
                <div class="detail-item-head">
                  <span class="detail-index">{{ String(index + 1).padStart(2, '0') }}</span>
                  <strong>{{ item.workType || '未填写' }}</strong>
                  <div class="detail-item-meta">
                    <span>{{ item.workDays ?? '—' }} 天</span>
                    <span>{{ item.progress ?? 0 }}%</span>
                  </div>
                </div>
                <p class="detail-content">{{ item.content || '—' }}</p>
                <div class="detail-sub-grid">
                  <div>
                    <span>遇到的问题及解决方法</span>
                    <p>{{ item.issues || '无' }}</p>
                  </div>
                  <div>
                    <span>遗留问题</span>
                    <p>{{ item.remainingIssues || '无' }}</p>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="detail-block plan-block next-plan-block">
            <div class="detail-section-title">
              <span>03</span> 下周工作计划
              <el-button v-if="!editingNextPlan && activeDetail.canEditNextWeekPlan" text type="primary" class="edit-plan-btn" @click="startEditNextPlan">
                <Edit /> 修改
              </el-button>
            </div>
            <template v-if="!editingNextPlan">
              <p class="detail-text">{{ activeDetail.nextWeekPlan || '—' }}</p>
            </template>
            <template v-else>
              <el-input
                v-model="nextPlanText"
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 12 }"
                maxlength="5000"
                show-word-limit
                placeholder="请填写员工的下周工作计划"
              />
              <div class="next-plan-actions">
                <el-button size="small" @click="cancelEditNextPlan">取消</el-button>
                <el-button size="small" type="primary" :loading="savingNextPlan" :disabled="!nextPlanText.trim()" @click="saveNextPlan">
                  <Check /> 保存修改
                </el-button>
              </div>
            </template>
          </section>

          <section class="review-block">
            <div class="review-head">
              <div>
                <span class="review-kicker">ADMIN REVIEW</span>
                <h3>本周完成情况评价</h3>
              </div>
              <span v-if="activeDetail.evaluatedAt" class="review-time">
                {{ activeDetail.evaluatedByName || '管理员' }} · {{ formatDateTime(activeDetail.evaluatedAt) }}
              </span>
            </div>

            <template v-if="activeDetail.status === 'SUBMITTED'">
              <div class="quick-tags">
                <span>快捷填写：</span>
                <button v-for="preset in evaluationPresets" :key="preset" @click="evalText = preset">{{ preset }}</button>
              </div>
              <el-input
                v-model="evalText"
                type="textarea"
                :rows="4"
                maxlength="500"
                show-word-limit
                placeholder="请填写本周完成情况评价，例如：工作推进扎实，交付质量高，问题反馈及时。"
              />
              <div class="review-actions">
                <span>评价将显示在员工端，并随 Excel 导出。</span>
                <el-button type="primary" :loading="evaluating" :disabled="!evalText.trim()" @click="saveEvaluation">
                  <Check /> 保存评价
                </el-button>
              </div>
            </template>
            <div v-else class="draft-hint">
              <Clock />
              <span>该员工周报仍为草稿，提交后才能进行评价。</span>
            </div>
          </section>
        </template>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
          <el-button
            v-if="activeDetail?.status === 'SUBMITTED'"
            type="warning"
            plain
            :loading="reopening"
            @click="reopenReport"
          >
            <RefreshLeft /> 退回修改
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Calendar,
  Check,
  Clock,
  DocumentChecked,
  Download,
  Edit,
  EditPen,
  RefreshLeft,
  Search,
  View
} from '@element-plus/icons-vue'
import { periodApi, reportApi } from '../api'
import {
  formatDateTime,
  initialOf,
  phaseOf,
  reportStatusOf
} from '../utils/format'

const route = useRoute()
const router = useRouter()

const periods = ref([])
const selectedPeriodId = ref(null)
const reports = ref([])
const loading = ref(false)
const exporting = ref(false)
const keyword = ref('')
const statusFilter = ref('ALL')
const drawerVisible = ref(false)
const activeDetail = ref(null)
const detailLoading = ref(false)
const evaluating = ref(false)
const reopening = ref(false)
const evalText = ref('')
const editingNextPlan = ref(false)
const nextPlanText = ref('')
const savingNextPlan = ref(false)
const autoOpened = ref(false)
const isMobile = ref(window.innerWidth < 820)

const statusTabs = [
  { label: '全部', value: 'ALL' },
  { label: '已提交', value: 'SUBMITTED' },
  { label: '草稿', value: 'DRAFT' },
  { label: '未填写', value: 'NOT_STARTED' }
]

const evaluationPresets = [
  '优秀：工作推进扎实，交付质量高，问题反馈及时。',
  '合格：按计划完成本周工作，进度符合预期。',
  '待改进：部分工作未按计划推进，请补充说明并明确改进措施。'
]

const selectedPeriod = computed(() => periods.value.find((item) => item.id === selectedPeriodId.value))
const pendingCount = computed(() => reports.value.filter((item) => item.status === 'SUBMITTED' && !item.evaluation).length)
const evaluatedCount = computed(() => reports.value.filter((item) => item.status === 'SUBMITTED' && item.evaluation).length)
const drawerSize = computed(() => (isMobile.value ? '100%' : '880px'))

const filteredReports = computed(() => {
  return reports.value.filter((item) => {
    const matchesStatus = statusFilter.value === 'ALL' || item.status === statusFilter.value
    const kw = keyword.value.trim().toLowerCase()
    const matchesKeyword = !kw || item.userName?.toLowerCase().includes(kw) || item.account?.toLowerCase().includes(kw)
    return matchesStatus && matchesKeyword
  })
})

onMounted(async () => {
  window.addEventListener('resize', updateViewport)
  await loadPeriods()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})

function updateViewport() {
  isMobile.value = window.innerWidth < 820
}

async function loadPeriods() {
  periods.value = await periodApi.list()
  if (!periods.value.length) return
  const queryId = Number(route.query.periodId)
  const filling = periods.value.find((item) => item.phase === 'FILLING')
  selectedPeriodId.value = periods.value.some((item) => item.id === queryId)
    ? queryId
    : (filling || periods.value[0]).id
  await loadReports()
  if (route.query.reportId && !autoOpened.value) {
    autoOpened.value = true
    const target = reports.value.find((item) => String(item.reportId) === String(route.query.reportId))
    if (target && target.status !== 'NOT_STARTED') {
      await openDetail(target)
    }
  }
}

async function loadReports() {
  if (!selectedPeriodId.value) return
  loading.value = true
  try {
    reports.value = await reportApi.list(selectedPeriodId.value)
  } finally {
    loading.value = false
  }
}

function changePeriod(value) {
  statusFilter.value = 'ALL'
  keyword.value = ''
  router.replace({ path: '/reports', query: { periodId: value } })
  loadReports()
}

function countByStatus(status) {
  if (status === 'ALL') return reports.value.length
  return reports.value.filter((item) => item.status === status).length
}

async function openDetail(row) {
  if (!row.reportId) return
  drawerVisible.value = true
  detailLoading.value = true
  activeDetail.value = null
  evalText.value = ''
  try {
    const detail = await reportApi.detail(row.reportId)
    activeDetail.value = detail
    evalText.value = detail.evaluation || ''
    nextPlanText.value = detail.nextWeekPlan || ''
    editingNextPlan.value = false
  } finally {
    detailLoading.value = false
  }
}

function startEditNextPlan() {
  nextPlanText.value = activeDetail.value?.nextWeekPlan || ''
  editingNextPlan.value = true
}

function cancelEditNextPlan() {
  nextPlanText.value = activeDetail.value?.nextWeekPlan || ''
  editingNextPlan.value = false
}

async function saveNextPlan() {
  if (!activeDetail.value || !nextPlanText.value.trim() || savingNextPlan.value) return
  savingNextPlan.value = true
  try {
    const detail = await reportApi.updateNextWeekPlan(activeDetail.value.reportId, nextPlanText.value.trim())
    activeDetail.value = detail
    nextPlanText.value = detail.nextWeekPlan || ''
    editingNextPlan.value = false
    ElMessage.success('下周工作计划已更新')
    await loadReports()
  } finally {
    savingNextPlan.value = false
  }
}

async function saveEvaluation() {
  if (!evalText.value.trim() || !activeDetail.value) return
  evaluating.value = true
  try {
    const detail = await reportApi.evaluate(activeDetail.value.reportId, evalText.value.trim())
    activeDetail.value = detail
    evalText.value = detail.evaluation || ''
    ElMessage.success('评价已保存')
    await loadReports()
  } finally {
    evaluating.value = false
  }
}

async function reopenReport() {
  if (!activeDetail.value) return
  try {
    await ElMessageBox.confirm(
      '退回后员工可重新编辑并提交，当前评价将被清空。确定退回吗？',
      '退回修改',
      { confirmButtonText: '确认退回', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }
  reopening.value = true
  try {
    const detail = await reportApi.reopen(activeDetail.value.reportId)
    activeDetail.value = detail
    evalText.value = ''
    ElMessage.success('已退回，员工可重新编辑')
    await loadReports()
  } finally {
    reopening.value = false
  }
}

function briefEvaluation(text) {
  if (!text) return ''
  return text.length > 18 ? `${text.slice(0, 18)}…` : text
}

async function exportExcel() {
  if (!selectedPeriodId.value || exporting.value) return
  exporting.value = true
  try {
    const response = await reportApi.export(selectedPeriodId.value)
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const disposition = response.headers['content-disposition'] || ''
    const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
    const filename = match
      ? decodeURIComponent(match[1])
      : `${selectedPeriod.value?.reportDate?.replaceAll('-', '') || 'weekly'}-综合技术服务组工作周报.xlsx`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('Excel 已开始下载')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.heading-actions :deep(svg) {
  width: 14px;
  margin-right: 4px;
}

.filter-card {
  padding: 18px 22px;
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex-wrap: wrap;
}

.filter-block {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.filter-label {
  color: var(--muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.period-filter {
  width: 250px;
}

.period-filter :deep(.el-select__wrapper),
.search-filter :deep(.el-input__wrapper) {
  min-height: 36px;
  border: 1px solid var(--line);
  background: #fbfdfc;
  box-shadow: none;
}

.filter-divider {
  width: 1px;
  height: 36px;
  background: #eaf1ef;
}

.status-filter {
  flex: 1;
  min-width: 320px;
}

.status-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid #e8f0ee;
  border-radius: 9px;
  background: #f7faf9;
}

.status-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.status-tab span {
  display: inline-flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border-radius: 5px;
  background: #e9efed;
  color: #7f918d;
  font-size: 7px;
  font-weight: 700;
}

.status-tab.active {
  background: #fff;
  color: var(--brand-700);
  box-shadow: 0 3px 8px rgba(15, 52, 47, 0.07);
}

.status-tab.active span {
  background: var(--brand-100);
  color: var(--brand-700);
}

.search-filter {
  width: 210px;
}

.review-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.summary-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--muted);
  font-size: 9px;
}

.summary-chip strong {
  color: var(--ink-soft);
  font-size: 12px;
}

.summary-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.summary-dot.green {
  background: var(--brand-500);
}

.summary-dot.amber {
  background: var(--accent);
}

.summary-dot.gray {
  background: #aabbb7;
}

.summary-chip.highlight {
  border-color: #ecdfc5;
  background: #fffbf3;
  color: #9e7b40;
}

.summary-chip.highlight strong {
  color: #a87928;
}

.summary-chip svg {
  width: 13px;
}

.summary-period {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: #9aada9;
  font-size: 8px;
}

.summary-period svg {
  width: 12px;
}

.table-card {
  padding: 20px 22px;
}

.table-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 4px 0;
  color: #9aada9;
  font-size: 8px;
}

.time-text,
.count-text {
  color: var(--ink-soft);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.evaluation-text {
  overflow: hidden;
  color: var(--ink-soft);
  font-size: 9px;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-tag {
  display: inline-flex;
  padding: 4px 7px;
  border-radius: 5px;
  background: #fdf3e4;
  color: #b07a18;
  font-size: 8px;
  font-weight: 700;
}

.not-submit-text {
  color: #aab9b6;
  font-size: 8px;
}

.report-table :deep(.el-button) {
  font-size: 9px;
}

.report-table :deep(.el-button svg) {
  width: 11px;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-chip.large {
  width: 42px;
  height: 42px;
  font-size: 15px;
  border-radius: 12px;
}

.drawer-title-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-name-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.drawer-name-row strong {
  font-size: 16px;
  color: var(--ink);
}

.drawer-title-copy > span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 400;
}

.drawer-body {
  min-height: 300px;
}

.detail-block {
  padding-bottom: 20px;
  margin-bottom: 20px;
  border-bottom: 1px solid #edf3f1;
}

.detail-section-title {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 14px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
}

.detail-section-title > span {
  display: flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 9px;
  font-weight: 800;
}

.detail-section-title em {
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
  font-style: normal;
  font-weight: 500;
}

.detail-text {
  padding: 15px 17px;
  margin: 0;
  border: 1px solid #edf3f1;
  border-radius: 11px;
  background: #fbfdfc;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.9;
  white-space: pre-wrap;
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  padding: 16px 17px;
  border: 1px solid #e8f0ee;
  border-radius: 12px;
  background: #fff;
}

.detail-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-index {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--brand-900);
  color: var(--brand-400);
  font-size: 7px;
  font-weight: 800;
}

.detail-item-head strong {
  font-size: 12px;
  color: var(--brand-700);
}

.detail-item-meta {
  display: flex;
  gap: 12px;
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
}

.detail-content {
  margin: 11px 0 10px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.9;
  white-space: pre-wrap;
}

.next-plan-block {
  padding: 16px 18px;
  border: 1px solid #d9ece7;
  border-bottom: 1px solid #d9ece7;
  border-radius: 13px;
  background: #f6fcfa;
}

.next-plan-block .detail-text {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 14px;
  line-height: 1.9;
}

.progress-text {
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 700;
}

.detail-sub-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 9px;
  border-top: 1px dashed #edf3f1;
}

.detail-sub-grid span {
  color: #8fa39f;
  font-size: 10px;
}

.detail-sub-grid p {
  margin: 5px 0 0;
  color: var(--ink-soft);
  font-size: 11.5px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.edit-plan-btn {
  margin-left: auto;
  font-size: 11px;
}

.edit-plan-btn :deep(svg) {
  width: 11px;
}

.next-plan-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 9px;
}

.next-plan-actions :deep(svg) {
  width: 11px;
  margin-right: 3px;
}

.review-block {
  padding: 18px;
  border: 1px solid #ecdfc7;
  border-radius: 14px;
  background: #fffdf8;
}

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.review-kicker {
  color: #b18a4e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.8px;
}

.review-head h3 {
  margin: 5px 0 0;
  font-size: 15px;
}

.review-time {
  color: #aaaf9f;
  font-size: 10px;
}

.quick-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.quick-tags > span {
  color: #a08c66;
  font-size: 10px;
}

.quick-tags button {
  padding: 5px 8px;
  border: 1px solid #ecdfc7;
  border-radius: 5px;
  background: #fffaf0;
  color: #a17c3d;
  cursor: pointer;
  font-size: 10px;
  transition: background 0.18s ease;
}

.quick-tags button:hover {
  background: #f9eeda;
}

.review-block :deep(.el-textarea__inner) {
  background: #fff;
  border-color: #e9dcc4;
  font-size: 13px;
  line-height: 1.8;
}

.review-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.review-actions > span {
  color: #b0a183;
  font-size: 10px;
}

.review-actions :deep(svg) {
  width: 12px;
  margin-right: 4px;
}

.draft-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 12px;
  border-radius: 8px;
  background: #f7f2e9;
  color: #a78b5d;
  font-size: 11px;
}

.draft-hint svg {
  width: 13px;
}

.drawer-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.drawer-footer :deep(svg) {
  width: 12px;
  margin-right: 4px;
}

@media (max-width: 1080px) {
  .filter-row {
    align-items: stretch;
  }

  .period-filter {
    width: 100%;
  }

  .filter-divider {
    display: none;
  }

  .status-filter {
    min-width: 0;
    width: 100%;
  }

  .search-filter {
    width: 100%;
  }
}

@media (max-width: 700px) {
  .table-card {
    padding: 14px;
    overflow-x: auto;
  }

  .status-tabs {
    overflow-x: auto;
  }

  .review-summary {
    gap: 6px;
  }

  .summary-period {
    width: 100%;
    margin-left: 0;
  }

  .detail-sub-grid {
    grid-template-columns: 1fr;
  }

  .review-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .review-actions .el-button {
    width: 100%;
  }
}
</style>
