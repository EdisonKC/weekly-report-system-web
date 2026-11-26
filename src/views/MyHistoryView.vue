<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">MY REPORT ARCHIVE</span>
        <h1>历史周报</h1>
        <p>回看每一期的工作记录、提交状态与管理员的完成情况评价。</p>
      </div>
      <div class="heading-actions">
        <el-button type="primary" @click="goCurrent"><EditPen /> 填写本期周报</el-button>
      </div>
    </div>

    <div class="history-stats">
      <div class="history-stat">
        <div class="history-icon teal"><Files /></div>
        <div><strong>{{ history.length }}</strong><span>周报总数</span></div>
      </div>
      <div class="history-stat">
        <div class="history-icon green"><CircleCheck /></div>
        <div><strong>{{ countByStatus('SUBMITTED') }}</strong><span>已提交</span></div>
      </div>
      <div class="history-stat">
        <div class="history-icon amber"><EditPen /></div>
        <div><strong>{{ countByStatus('DRAFT') }}</strong><span>草稿</span></div>
      </div>
      <div class="history-stat">
        <div class="history-icon slate"><Medal /></div>
        <div><strong>{{ evaluatedCount }}</strong><span>已评价</span></div>
      </div>
    </div>

    <section class="app-card history-card">
      <div class="table-head">
        <div>
          <h2>我的周报记录</h2>
          <p>点击行末“查看”可阅读完整周报和评价。</p>
        </div>
        <div class="status-tabs">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            class="status-tab"
            :class="{ active: statusFilter === tab.value }"
            @click="statusFilter = tab.value"
          >
            {{ tab.label }} <span>{{ countByStatus(tab.value) }}</span>
          </button>
        </div>
      </div>

      <el-table v-loading="loading" :data="filteredHistory" row-key="reportId" class="history-table">
        <el-table-column label="周报周期" min-width="250">
          <template #default="{ row }">
            <div class="period-cell">
              <div class="period-date">
                <strong>{{ formatMonthDay(row.reportDate) }}</strong>
                <span>{{ row.reportDate?.slice(0, 4) }}</span>
              </div>
              <div class="period-copy">
                <strong>{{ row.periodTitle }}</strong>
                <span>{{ formatDate(row.periodStart) }} — {{ formatDate(row.periodEnd) }}</span>
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
        <el-table-column label="工作项 / 时长" width="122">
          <template #default="{ row }">
            <div class="count-stack">
              <strong>{{ row.itemCount }} 项</strong>
              <span>{{ row.totalDays }} 天</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="平均进度" width="150">
          <template #default="{ row }">
            <div class="progress-line">
              <div class="progress-track"><div class="progress-fill" :style="{ width: `${row.averageProgress}%` }"></div></div>
              <span>{{ row.averageProgress }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="完成情况评价" min-width="210">
          <template #default="{ row }">
            <div v-if="row.evaluation" class="evaluation-text" :title="row.evaluation">{{ briefEvaluation(row.evaluation) }}</div>
            <span v-else-if="row.status === 'SUBMITTED'" class="pending-tag">待评价</span>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="108" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openDetail(row)"><View /> 查看</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon"><Files /></div>
            <strong>还没有历史周报</strong>
            <span>完成并提交周报后，记录会出现在这里。</span>
          </div>
        </template>
      </el-table>
      <div class="table-foot">
        <span>共 {{ filteredHistory.length }} 份周报</span>
        <span>已评价 {{ evaluatedCount }} 份</span>
      </div>
    </section>

    <el-drawer v-model="drawerVisible" :size="drawerSize" append-to-body class="history-drawer" destroy-on-close>
      <template #header>
        <div v-if="activeDetail" class="drawer-title">
          <div class="drawer-icon"><Files /></div>
          <div class="drawer-title-copy">
            <div class="drawer-name-row">
              <strong>{{ activeDetail.periodTitle }}</strong>
              <span class="status-pill" :class="reportStatusOf(activeDetail.status).className">
                {{ reportStatusOf(activeDetail.status).label }}
              </span>
            </div>
            <span>{{ formatDate(activeDetail.period?.periodStart) }} — {{ formatDate(activeDetail.period?.periodEnd) }}</span>
          </div>
        </div>
        <div v-else><strong>周报详情</strong></div>
      </template>

      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="activeDetail">
          <div class="detail-meta">
            <div><span>周报日期</span><strong>{{ formatDate(activeDetail.period?.reportDate) }}</strong></div>
            <div><span>提交时间</span><strong>{{ activeDetail.submittedAt ? formatDateTime(activeDetail.submittedAt) : '未提交' }}</strong></div>
            <div><span>工作项</span><strong>{{ activeDetail.items?.length || 0 }} 项</strong></div>
          </div>

          <section class="detail-block">
            <div class="detail-section-title"><span>01</span> 上周工作计划</div>
            <p class="detail-text">{{ activeDetail.lastWeekPlan || '—' }}</p>
          </section>

          <section class="detail-block">
            <div class="detail-section-title"><span>02</span> 本周工作内容</div>
            <div class="detail-items">
              <article v-for="(item, index) in activeDetail.items" :key="item.id || index" class="detail-item">
                <div class="detail-item-head">
                  <span class="detail-index">{{ String(index + 1).padStart(2, '0') }}</span>
                  <strong>{{ item.workType || '未填写' }}</strong>
                  <div class="detail-item-meta"><span>{{ item.workDays ?? '—' }} 天</span><span>{{ item.progress ?? 0 }}%</span></div>
                </div>
                <p class="detail-content">{{ item.content || '—' }}</p>
                <div class="detail-progress"><div class="progress-track"><div class="progress-fill" :style="{ width: `${item.progress || 0}%` }"></div></div></div>
                <div class="detail-sub-grid">
                  <div><span>遇到的问题及解决方法</span><p>{{ item.issues || '无' }}</p></div>
                  <div><span>遗留问题</span><p>{{ item.remainingIssues || '无' }}</p></div>
                </div>
              </article>
              <div v-if="!activeDetail.items?.length" class="empty-items">暂无工作内容</div>
            </div>
          </section>

          <section class="detail-block">
            <div class="detail-section-title"><span>03</span> 下周工作计划</div>
            <p class="detail-text">{{ activeDetail.nextWeekPlan || '—' }}</p>
          </section>

          <section class="evaluation-block">
            <div class="evaluation-head">
              <div class="evaluation-icon"><Medal /></div>
              <div><span>ADMIN REVIEW</span><h3>本周完成情况评价</h3></div>
              <small v-if="activeDetail.evaluatedAt">{{ formatDateTime(activeDetail.evaluatedAt) }}</small>
            </div>
            <p v-if="activeDetail.evaluation">{{ activeDetail.evaluation }}</p>
            <div v-else class="evaluation-empty"><Clock /> 管理员尚未评价</div>
          </section>
        </template>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <el-button @click="drawerVisible = false">关闭</el-button>
          <el-button v-if="activeDetail?.canEdit" type="primary" @click="continueEdit(activeDetail.periodId)">
            <EditPen /> 继续填写
          </el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CircleCheck,
  Clock,
  EditPen,
  Files,
  Medal,
  View
} from '@element-plus/icons-vue'
import { reportApi } from '../api'
import {
  formatDate,
  formatDateTime,
  formatMonthDay,
  reportStatusOf
} from '../utils/format'

const router = useRouter()
const history = ref([])
const loading = ref(false)
const statusFilter = ref('ALL')
const drawerVisible = ref(false)
const detailLoading = ref(false)
const activeDetail = ref(null)
const isMobile = ref(window.innerWidth < 820)

const statusTabs = [
  { label: '全部', value: 'ALL' },
  { label: '已提交', value: 'SUBMITTED' },
  { label: '草稿', value: 'DRAFT' }
]

const filteredHistory = computed(() => {
  if (statusFilter.value === 'ALL') return history.value
  return history.value.filter((item) => item.status === statusFilter.value)
})
const evaluatedCount = computed(() => history.value.filter((item) => Boolean(item.evaluation)).length)
const drawerSize = computed(() => (isMobile.value ? '100%' : '720px'))

onMounted(() => {
  window.addEventListener('resize', updateViewport)
  loadHistory()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})

function updateViewport() {
  isMobile.value = window.innerWidth < 820
}

async function loadHistory() {
  loading.value = true
  try {
    history.value = await reportApi.history()
  } finally {
    loading.value = false
  }
}

function countByStatus(status) {
  if (status === 'ALL') return history.value.length
  return history.value.filter((item) => item.status === status).length
}

async function openDetail(row) {
  drawerVisible.value = true
  detailLoading.value = true
  activeDetail.value = null
  try {
    activeDetail.value = await reportApi.detail(row.reportId)
  } finally {
    detailLoading.value = false
  }
}

function goCurrent() {
  router.push('/my-report')
}

function continueEdit(periodId) {
  drawerVisible.value = false
  router.push({ path: '/my-report', query: { periodId } })
}

function briefEvaluation(text) {
  if (!text) return ''
  return text.length > 18 ? `${text.slice(0, 18)}…` : text
}
</script>

<style scoped>
.heading-actions :deep(svg) {
  width: 14px;
  margin-right: 4px;
}

.history-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.history-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(210, 225, 221, 0.85);
  border-radius: 15px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.history-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  font-size: 18px;
}

.history-icon.teal {
  background: #e5f6f2;
  color: #0f8b7d;
}

.history-icon.green {
  background: #eaf5ed;
  color: #3d8d63;
}

.history-icon.amber {
  background: #fcf3e4;
  color: #bd861f;
}

.history-icon.slate {
  background: #eef2f1;
  color: #617874;
}

.history-stat > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.history-stat strong {
  font-size: 23px;
  line-height: 1;
}

.history-stat span {
  color: var(--muted);
  font-size: 8px;
}

.history-card {
  padding: 22px;
}

.table-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.table-head h2 {
  margin: 0 0 5px;
  font-size: 16px;
}

.table-head p {
  margin: 0;
  color: var(--muted);
  font-size: 9px;
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

.period-cell {
  display: flex;
  align-items: center;
  gap: 11px;
}

.period-date {
  display: flex;
  width: 46px;
  height: 45px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border-radius: 10px;
  background: #f4f8f7;
}

.period-date strong {
  color: var(--brand-700);
  font-size: 11px;
  font-weight: 700;
}

.period-date span {
  margin-top: 2px;
  color: #a3b4b0;
  font-size: 7px;
}

.period-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.period-copy strong {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.period-copy span {
  color: var(--muted);
  font-size: 8px;
}

.time-text {
  color: var(--ink-soft);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.count-stack {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.count-stack strong {
  color: var(--ink-soft);
  font-size: 10px;
}

.count-stack span {
  color: var(--muted);
  font-size: 8px;
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

.history-table :deep(.el-button) {
  font-size: 9px;
}

.history-table :deep(.el-button svg) {
  width: 11px;
}

.table-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 4px 0;
  color: #9aada9;
  font-size: 8px;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drawer-icon {
  display: flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 19px;
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
  color: var(--ink);
  font-size: 16px;
}

.drawer-title-copy > span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 400;
}

.drawer-body {
  min-height: 300px;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 14px;
  margin-bottom: 18px;
  border: 1px solid #edf3f1;
  border-radius: 11px;
  background: #fbfdfc;
}

.detail-meta div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-meta span {
  color: var(--muted);
  font-size: 8px;
}

.detail-meta strong {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 600;
}

.detail-block {
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid #edf3f1;
}

.detail-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
}

.detail-section-title > span {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 7px;
  font-weight: 800;
}

.detail-text {
  padding: 12px 14px;
  margin: 0;
  border: 1px solid #edf3f1;
  border-radius: 9px;
  background: #fbfdfc;
  color: var(--ink-soft);
  font-size: 10px;
  line-height: 1.85;
  white-space: pre-wrap;
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.detail-item {
  padding: 12px 14px;
  border: 1px solid #e8f0ee;
  border-radius: 10px;
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
  color: var(--brand-700);
  font-size: 10px;
}

.detail-item-meta {
  display: flex;
  gap: 8px;
  margin-left: auto;
  color: var(--muted);
  font-size: 8px;
}

.detail-content {
  margin: 8px 0;
  color: var(--ink-soft);
  font-size: 10px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.detail-progress .progress-track {
  height: 4px;
  overflow: hidden;
  border-radius: 99px;
  background: #edf3f1;
}

.detail-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-400), var(--brand-600));
}

.detail-sub-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px dashed #edf3f1;
}

.detail-sub-grid span {
  color: #9aada9;
  font-size: 8px;
}

.detail-sub-grid p {
  margin: 3px 0 0;
  color: var(--ink-soft);
  font-size: 9px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.empty-items {
  padding: 20px;
  color: var(--muted);
  font-size: 9px;
  text-align: center;
}

.evaluation-block {
  padding: 16px;
  border: 1px solid #ecdfc7;
  border-radius: 13px;
  background: #fffdf8;
}

.evaluation-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.evaluation-icon {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f9edd9;
  color: #b17b20;
  font-size: 17px;
}

.evaluation-head span {
  color: #b18a4e;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.8px;
}

.evaluation-head h3 {
  margin: 3px 0 0;
  font-size: 12px;
}

.evaluation-head small {
  margin-left: auto;
  color: #aab6b2;
  font-size: 8px;
}

.evaluation-block > p {
  padding-top: 11px;
  margin: 11px 0 0;
  border-top: 1px solid #f1e8d8;
  color: var(--ink-soft);
  font-size: 11px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.evaluation-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 11px;
  margin-top: 11px;
  border-top: 1px solid #f1e8d8;
  color: #a4b3b0;
  font-size: 9px;
}

.evaluation-empty svg {
  width: 12px;
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

@media (max-width: 1050px) {
  .history-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-head {
    flex-direction: column;
  }
}

@media (max-width: 680px) {
  .history-stats {
    grid-template-columns: 1fr;
  }

  .history-card {
    padding: 14px;
    overflow-x: auto;
  }

  .detail-meta {
    grid-template-columns: 1fr;
  }

  .detail-sub-grid {
    grid-template-columns: 1fr;
  }
}
</style>
