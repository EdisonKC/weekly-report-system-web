<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">MY WEEKLY REPORT</span>
        <h1>我的周报</h1>
        <p>记录本周工作投入，沉淀问题与下一步计划。</p>
      </div>
      <div class="heading-actions">
        <el-select
          v-if="periods.length"
          v-model="selectedPeriodId"
          class="period-select"
          placeholder="选择周报周期"
          @change="changePeriod"
        >
          <el-option v-for="period in periods" :key="period.id" :label="`${period.title} · ${phaseOf(period).label}`" :value="period.id" />
        </el-select>
        <span v-if="currentPeriod" class="status-pill" :class="phaseOf(currentPeriod).className">
          {{ phaseOf(currentPeriod).label }}
        </span>
        <template v-if="canEdit">
          <el-button plain :loading="templateDownloading" @click="downloadTemplate">
            <Download /> 导入模板
          </el-button>
          <el-button plain :loading="importing" @click="selectImportFile">
            <Upload /> 导入周报
          </el-button>
          <input ref="fileInputRef" type="file" accept=".xlsx" class="hidden-file" @change="handleFileChange" />
        </template>
      </div>
    </div>

    <div v-if="!loading && !periods.length" class="app-card empty-wrap">
      <div class="empty-state">
        <div class="empty-icon"><Calendar /></div>
        <strong>还没有可填写的周报周期</strong>
        <span>管理员创建并设置填写时间后，周报周期会出现在这里。</span>
      </div>
    </div>

    <el-skeleton v-else-if="loading" :rows="10" animated class="app-card loading-card" />

    <template v-else-if="report">
      <section class="meta-card">
        <div class="meta-main">
          <div class="meta-period">
            <span class="meta-label">REPORT PERIOD</span>
            <h2>{{ report.periodTitle }}</h2>
            <div class="meta-tags">
              <span class="status-pill" :class="reportStatusOf(report.status).className">
                {{ reportStatusLabel }}
              </span>
              <span v-if="report.submittedAt" class="meta-submitted">
                <CircleCheck /> 提交于 {{ formatDateTime(report.submittedAt) }}
              </span>
            </div>
          </div>
          <div class="meta-stats">
            <div class="meta-stat">
              <span>工作周期</span>
              <strong>{{ formatDate(currentPeriod?.periodStart) }} — {{ formatDate(currentPeriod?.periodEnd) }}</strong>
            </div>
            <div class="meta-stat">
              <span>填写时间</span>
              <strong>{{ formatDateTime(currentPeriod?.fillStart) }} — {{ formatDateTime(currentPeriod?.fillEnd) }}</strong>
            </div>
            <div class="meta-stat">
              <span>本周工作项</span>
              <strong>{{ summary.itemCount }} 项 · {{ summary.totalDays }} 天</strong>
            </div>
            <div class="meta-stat">
              <span>平均完成进度</span>
              <strong>{{ summary.averageProgress }}%</strong>
            </div>
          </div>
        </div>
        <div v-if="canEdit" class="deadline-box" :class="{ urgent: deadlineDays <= 2 }">
          <div class="deadline-icon"><Timer /></div>
          <div>
            <span>距离填写截止</span>
            <strong>{{ countdownText(currentPeriod?.fillEnd) }}</strong>
            <small>{{ formatDateTime(currentPeriod?.fillEnd) }} 截止</small>
          </div>
        </div>
      </section>

      <div v-if="!canEdit && report.status !== 'SUBMITTED'" class="notice-card" :class="currentPhase === 'CLOSED' ? 'is-closed' : 'is-upcoming'">
        <Clock />
        <div>
          <strong>{{ currentPhase === 'CLOSED' ? '本期填写已截止' : '填写时间尚未开始' }}</strong>
          <span>
            {{ currentPhase === 'CLOSED'
              ? '当前内容已锁定，如需修改请联系管理员。'
              : `请在 ${formatDateTime(currentPeriod?.fillStart)} 后开始填写。` }}
          </span>
        </div>
      </div>

      <section v-if="report.status === 'SUBMITTED'" class="evaluation-card">
        <div class="evaluation-head">
          <div class="evaluation-icon"><Medal /></div>
          <div>
            <span class="evaluation-kicker">ADMIN REVIEW</span>
            <h3>本周完成情况评价</h3>
          </div>
          <span v-if="report.evaluatedAt" class="evaluation-time">{{ formatDateTime(report.evaluatedAt) }}</span>
        </div>
        <div v-if="report.evaluation" class="evaluation-content">
          <p>{{ report.evaluation }}</p>
          <span>评价人：{{ report.evaluatedByName || '管理员' }}</span>
        </div>
        <div v-else class="evaluation-empty">
          <Clock />
          <span>管理员尚未评价，请耐心等待。</span>
        </div>
      </section>

      <section class="app-card editor-card" :class="{ 'is-readonly': !canEdit }">
        <div class="editor-section">
          <div class="section-heading">
            <div class="section-index">01</div>
            <div>
              <h3>上周工作计划</h3>
              <p>回顾上周计划，说明目标背景与推进基础。</p>
            </div>
          </div>
          <div v-if="showAutoFillHint" class="auto-fill-hint">
            <div class="auto-fill-icon"><CopyDocument /></div>
            <div>
              <strong>已自动带入上次周报的下周工作计划</strong>
              <span>来源：{{ report.autoFillSource }}，可直接修改后再保存。</span>
            </div>
          </div>
          <div v-if="!canEdit" class="readonly-text">{{ form.lastWeekPlan || '—' }}</div>
          <el-input
            v-else
            v-model="form.lastWeekPlan"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 12 }"
            maxlength="5000"
            show-word-limit
            placeholder="请填写上周工作计划，可分条描述……"
          />
        </div>

        <div class="editor-section">
          <div class="section-heading">
            <div class="section-index">02</div>
            <div>
              <h3>本周工作内容</h3>
              <p>按工作性质逐项记录完成情况，进度以百分比表示。</p>
            </div>
            <span class="section-count">{{ form.items.length }} 项</span>
          </div>

          <div class="work-item-list">
            <article v-for="(item, index) in form.items" :key="item.key" class="work-item">
              <div class="work-item-head">
                <div class="work-item-number">{{ String(index + 1).padStart(2, '0') }}</div>
                <div class="work-item-title">
                  <span>工作项 {{ String(index + 1).padStart(2, '0') }}</span>
                  <el-select
                    v-model="item.workType"
                    class="nature-select"
                    placeholder="工作性质"
                    :disabled="!canEdit"
                    filterable
                    allow-create
                  >
                    <el-option v-for="option in workTypes" :key="option" :label="option" :value="option" />
                  </el-select>
                </div>
                <div class="work-item-head-right">
                  <span class="work-item-progress">{{ item.progress || 0 }}%</span>
                  <el-tooltip content="删除本项" placement="top" :disabled="!canEdit">
                    <button class="icon-btn danger" :disabled="!canEdit || form.items.length <= 1" @click="removeItem(index)">
                      <Delete />
                    </button>
                  </el-tooltip>
                </div>
              </div>

              <div class="work-item-body">
                <label class="field full">
                  <span>本周主要完成内容 <em>*</em></span>
                  <el-input
                    v-model="item.content"
                    type="textarea"
                    :rows="2"
                    maxlength="2000"
                    :readonly="!canEdit"
                    :autosize="!canEdit ? { minRows: 2, maxRows: 8 } : false"
                    placeholder="具体完成了什么？建议包含对象、动作与结果"
                  />
                </label>

                <div class="field-row">
                  <label class="field">
                    <span>工作时长（天） <em>*</em></span>
                    <el-input-number
                      v-model="item.workDays"
                      :min="0"
                      :max="31"
                      :step="0.5"
                      :precision="1"
                      controls-position="right"
                      :disabled="!canEdit"
                      placeholder="0.0"
                    />
                  </label>
                  <label class="field progress-field">
                    <span>完成进度 <em>*</em></span>
                    <div class="progress-editor">
                      <el-slider v-model="item.progress" :min="0" :max="100" :step="5" :disabled="!canEdit" />
                      <strong>{{ item.progress || 0 }}%</strong>
                    </div>
                  </label>
                </div>

                <div class="field-row">
                  <label class="field">
                    <span>遇到的问题及解决方法</span>
                    <el-input
                      v-model="item.issues"
                      type="textarea"
                      :rows="2"
                      maxlength="2000"
                      :readonly="!canEdit"
                      :autosize="!canEdit ? { minRows: 2, maxRows: 8 } : false"
                      placeholder="遇到什么问题？如何解决或需要什么支持？"
                    />
                  </label>
                  <label class="field">
                    <span>遗留问题</span>
                    <el-input
                      v-model="item.remainingIssues"
                      type="textarea"
                      :rows="2"
                      maxlength="2000"
                      :readonly="!canEdit"
                      :autosize="!canEdit ? { minRows: 2, maxRows: 8 } : false"
                      placeholder="尚未闭环、需要后续跟进的事项"
                    />
                  </label>
                </div>
              </div>
            </article>
          </div>

          <button v-if="canEdit" class="add-item-btn" @click="addItem">
            <Plus /> 添加一项工作内容
          </button>
        </div>

        <div class="editor-section">
          <div class="section-heading">
            <div class="section-index">03</div>
            <div>
              <h3>下周工作计划</h3>
              <p>明确下周重点目标与交付节奏。</p>
            </div>
          </div>
          <div v-if="!canEdit" class="readonly-text">{{ form.nextWeekPlan || '—' }}</div>
          <el-input
            v-else
            v-model="form.nextWeekPlan"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 12 }"
            maxlength="5000"
            show-word-limit
            placeholder="请填写下周工作计划，可分条描述……"
          />
        </div>

        <div class="editor-footer">
          <div class="footer-summary">
            <div><span>工作项</span><strong>{{ summary.itemCount }}</strong></div>
            <i></i>
            <div><span>总时长</span><strong>{{ summary.totalDays }} 天</strong></div>
            <i></i>
            <div><span>平均进度</span><strong>{{ summary.averageProgress }}%</strong></div>
          </div>
          <div v-if="canEdit" class="footer-actions">
            <el-button :loading="saving" @click="saveDraft">保存草稿</el-button>
            <el-button type="primary" :loading="submitting" @click="submitReport">
              <Check /> 提交周报
            </el-button>
          </div>
          <div v-else class="locked-tip">
            <Lock />
            <span>{{ report.status === 'SUBMITTED' ? '周报已提交，内容已锁定' : '当前不可编辑' }}</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Calendar,
  Check,
  CircleCheck,
  Clock,
  CopyDocument,
  Delete,
  Download,
  Lock,
  Medal,
  Plus,
  Timer,
  Upload
} from '@element-plus/icons-vue'
import { periodApi, reportApi } from '../api'
import { downloadResponse } from '../utils/download'
import {
  countdownText,
  formatDate,
  formatDateTime,
  phaseOf,
  reportStatusOf
} from '../utils/format'

const route = useRoute()
const router = useRouter()

const periods = ref([])
const selectedPeriodId = ref(null)
const report = ref(null)
const loading = ref(true)
const saving = ref(false)
const submitting = ref(false)
const importing = ref(false)
const templateDownloading = ref(false)
const fileInputRef = ref()
let keySeed = 0

const workTypes = ['开发', '维护', '设计', '分析', '其他', '出差']

const form = reactive({
  lastWeekPlan: '',
  nextWeekPlan: '',
  items: []
})

const currentPeriod = computed(() => report.value?.period || periods.value.find((item) => item.id === selectedPeriodId.value))
const currentPhase = computed(() => currentPeriod.value?.phase || '')
const canEdit = computed(() => Boolean(report.value?.canEdit))
const showAutoFillHint = computed(() => Boolean(
  report.value?.lastWeekPlanAutoFilled &&
  form.lastWeekPlan === (report.value?.lastWeekPlan || '')
))
const reportStatusLabel = computed(() => report.value?.statusLabel || reportStatusOf(report.value?.status).label)
const deadlineDays = computed(() => {
  if (!currentPeriod.value?.fillEnd) return 99
  const end = new Date(String(currentPeriod.value.fillEnd).replace(' ', 'T')).getTime()
  return (end - Date.now()) / 86400000
})

const summary = computed(() => {
  const meaningful = form.items.filter((item) => isMeaningful(item))
  const totalDays = meaningful.reduce((sum, item) => sum + (Number(item.workDays) || 0), 0)
  const averageProgress = meaningful.length
    ? Math.round(meaningful.reduce((sum, item) => sum + (Number(item.progress) || 0), 0) / meaningful.length)
    : 0
  return {
    itemCount: meaningful.length,
    totalDays: Number(totalDays.toFixed(1)),
    averageProgress
  }
})

onMounted(loadPeriods)

watch(
  () => route.query.periodId,
  (value) => {
    if (value && Number(value) !== selectedPeriodId.value && periods.value.length) {
      selectedPeriodId.value = Number(value)
      loadReport()
    }
  }
)

async function loadPeriods() {
  loading.value = true
  try {
    periods.value = await periodApi.list()
    if (!periods.value.length) {
      report.value = null
      return
    }
    const queryId = Number(route.query.periodId)
    const filling = periods.value.find((item) => item.phase === 'FILLING')
    selectedPeriodId.value = periods.value.some((item) => item.id === queryId)
      ? queryId
      : (filling || periods.value[0]).id
    await loadReport()
  } finally {
    loading.value = false
  }
}

async function loadReport() {
  if (!selectedPeriodId.value) return
  loading.value = true
  try {
    const data = await reportApi.my(selectedPeriodId.value)
    report.value = data
    form.lastWeekPlan = data.lastWeekPlan || ''
    form.nextWeekPlan = data.nextWeekPlan || ''
    form.items = (data.items || []).map(toItemModel)
    if (!data.items?.length && data.canEdit) {
      form.items = [createBlankItem(), createBlankItem(), createBlankItem(), createBlankItem()]
    }
    if (!form.items.length) {
      form.items = [createBlankItem()]
    }
  } finally {
    loading.value = false
  }
}

function changePeriod(value) {
  router.replace({ path: '/my-report', query: { periodId: value } })
  loadReport()
}

function createBlankItem() {
  return {
    key: ++keySeed,
    workType: '',
    content: '',
    workDays: null,
    progress: 0,
    issues: '',
    remainingIssues: ''
  }
}

function toItemModel(item) {
  return {
    key: ++keySeed,
    id: item.id,
    workType: item.workType || '',
    content: item.content || '',
    workDays: item.workDays === null || item.workDays === undefined ? null : Number(item.workDays),
    progress: item.progress === null || item.progress === undefined ? 0 : Number(item.progress),
    issues: item.issues || '',
    remainingIssues: item.remainingIssues || ''
  }
}

function addItem() {
  if (!canEdit.value) return
  form.items.push(createBlankItem())
  setTimeout(() => {
    const el = document.querySelector('.work-item:last-child')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 50)
}

function removeItem(index) {
  if (!canEdit.value || form.items.length <= 1) return
  form.items.splice(index, 1)
}

function isMeaningful(item) {
  return Boolean(
    item.content?.trim() ||
    item.workType?.trim() ||
    item.workDays !== null ||
    Number(item.progress) > 0 ||
    item.issues?.trim() ||
    item.remainingIssues?.trim()
  )
}

function buildPayload() {
  return {
    lastWeekPlan: form.lastWeekPlan?.trim() || '',
    nextWeekPlan: form.nextWeekPlan?.trim() || '',
    items: form.items.filter(isMeaningful).map((item) => ({
      workType: item.workType?.trim() || '',
      content: item.content?.trim() || '',
      workDays: item.workDays,
      progress: Number(item.progress) || 0,
      issues: item.issues?.trim() || '',
      remainingIssues: item.remainingIssues?.trim() || ''
    }))
  }
}

function validateForSubmit() {
  if (!form.lastWeekPlan?.trim()) {
    ElMessage.warning('请填写上周工作计划')
    return false
  }
  const items = form.items.filter(isMeaningful)
  if (!items.length) {
    ElMessage.warning('请至少填写一条本周工作内容')
    return false
  }
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (!item.workType?.trim()) {
      ElMessage.warning(`第 ${i + 1} 项工作缺少工作性质`)
      return false
    }
    if (!item.content?.trim()) {
      ElMessage.warning(`第 ${i + 1} 项工作缺少完成内容`)
      return false
    }
    if (item.workDays === null || item.workDays === undefined || item.workDays === '') {
      ElMessage.warning(`第 ${i + 1} 项工作缺少工作时长`)
      return false
    }
    if (item.progress === null || item.progress === undefined) {
      ElMessage.warning(`第 ${i + 1} 项工作缺少完成进度`)
      return false
    }
  }
  if (!form.nextWeekPlan?.trim()) {
    ElMessage.warning('请填写下周工作计划')
    return false
  }
  return true
}

function selectImportFile() {
  if (!canEdit.value || importing.value) return
  fileInputRef.value?.click()
}

async function downloadTemplate() {
  if (!currentPeriod.value || templateDownloading.value) return
  templateDownloading.value = true
  try {
    const response = await reportApi.importTemplate(selectedPeriodId.value)
    const reportDate = String(currentPeriod.value.reportDate || '').replaceAll('-', '')
    const fallback = `${reportDate}-${report.value?.userName || '员工'}-周报导入模板.xlsx`
    const filename = downloadResponse(response, fallback)
    ElMessage.success(`已下载 ${filename}`)
  } finally {
    templateDownloading.value = false
  }
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!/\.xlsx$/i.test(file.name)) {
    ElMessage.warning('仅支持 .xlsx 格式的周报文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.warning('导入文件不能超过 10MB')
    return
  }
  const hasPendingContent = form.items.some(isMeaningful)
    || (form.lastWeekPlan || '') !== (report.value?.lastWeekPlan || '')
    || (form.nextWeekPlan || '') !== (report.value?.nextWeekPlan || '')
  if (hasPendingContent) {
    try {
      await ElMessageBox.confirm(
        '导入会覆盖当前表单中的上周计划、本周工作内容和下周计划，是否继续？',
        '导入周报',
        { confirmButtonText: '继续导入', cancelButtonText: '取消', type: 'warning' }
      )
    } catch (e) {
      return
    }
  }
  importing.value = true
  try {
    const data = await reportApi.importExcel(selectedPeriodId.value, file)
    applyReport(data)
    ElMessage.success('导入成功，已保存为草稿，请检查后提交')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    importing.value = false
  }
}

async function saveDraft() {
  if (!canEdit.value || saving.value) return
  saving.value = true
  try {
    const data = await reportApi.saveDraft(selectedPeriodId.value, buildPayload())
    applyReport(data)
    ElMessage.success('草稿已保存')
  } finally {
    saving.value = false
  }
}

async function submitReport() {
  if (!canEdit.value || submitting.value) return
  if (!validateForSubmit()) return
  try {
    await ElMessageBox.confirm(
      '提交后内容将锁定，管理员可对本周完成情况进行评价。确定提交吗？',
      '提交周报',
      {
        confirmButtonText: '确认提交',
        cancelButtonText: '再检查一下',
        type: 'info'
      }
    )
  } catch (e) {
    return
  }
  submitting.value = true
  try {
    const data = await reportApi.submit(selectedPeriodId.value, buildPayload())
    applyReport(data)
    ElMessage.success('周报已提交，等待管理员评价')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}

function applyReport(data) {
  report.value = data
  form.lastWeekPlan = data.lastWeekPlan || ''
  form.nextWeekPlan = data.nextWeekPlan || ''
  form.items = (data.items || []).map(toItemModel)
  if (!form.items.length) {
    form.items = [createBlankItem()]
  }
}
</script>

<style scoped>
.period-select {
  width: 260px;
}

.hidden-file {
  display: none;
}

.heading-actions :deep(svg) {
  width: 13px;
  margin-right: 3px;
}

.period-select :deep(.el-select__wrapper) {
  min-height: 38px;
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: none;
}

.loading-card {
  padding: 24px;
}

.empty-wrap {
  padding: 40px;
}

.meta-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 28px;
  margin-bottom: 16px;
  border: 1px solid rgba(210, 225, 221, 0.8);
  border-radius: 20px;
  background:
    radial-gradient(circle at 75% 0%, rgba(46, 198, 177, 0.09), transparent 30%),
    #fff;
  box-shadow: var(--shadow-sm);
}

.meta-main {
  min-width: 0;
  flex: 1;
}

.meta-label {
  color: var(--brand-600);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 2px;
}

.meta-period h2 {
  margin: 9px 0 10px;
  font-size: 24px;
  font-weight: 300;
  letter-spacing: -0.6px;
}

.meta-tags {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-submitted {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 9px;
}

.meta-submitted svg {
  width: 11px;
  color: var(--success);
}

.meta-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(100px, 1fr));
  gap: 18px;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid #edf3f1;
}

.meta-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-stat span {
  color: var(--muted);
  font-size: 9px;
}

.meta-stat strong {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 600;
  line-height: 1.5;
}

.deadline-box {
  display: flex;
  width: 205px;
  flex-shrink: 0;
  align-items: center;
  gap: 12px;
  padding: 15px 16px;
  border: 1px solid #d9ebe7;
  border-radius: 14px;
  background: #f3faf8;
}

.deadline-box.urgent {
  border-color: #f0dfc2;
  background: #fff9ef;
}

.deadline-icon {
  display: flex;
  width: 37px;
  height: 37px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #e1f4ef;
  color: var(--brand-600);
  font-size: 18px;
}

.deadline-box.urgent .deadline-icon {
  background: #f9ecd6;
  color: var(--warning);
}

.deadline-box > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.deadline-box span {
  color: var(--muted);
  font-size: 8px;
}

.deadline-box strong {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
}

.deadline-box small {
  color: #9aada9;
  font-size: 8px;
}

.notice-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 17px;
  margin-bottom: 16px;
  border-radius: 13px;
  font-size: 10px;
}

.notice-card svg {
  width: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.notice-card div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.notice-card strong {
  font-size: 11px;
}

.notice-card span {
  opacity: 0.72;
  line-height: 1.55;
}

.notice-card.is-closed {
  border: 1px solid #f0dcdc;
  background: #fdf6f6;
  color: #a55050;
}

.notice-card.is-upcoming {
  border: 1px solid #f0e4ca;
  background: #fffbf3;
  color: #a77925;
}

.evaluation-card {
  padding: 20px 24px;
  margin-bottom: 16px;
  border: 1px solid #eadfc8;
  border-radius: 18px;
  background:
    radial-gradient(circle at 100% 0%, rgba(217, 168, 78, 0.12), transparent 30%),
    #fffdf8;
}

.evaluation-head {
  display: flex;
  align-items: center;
  gap: 11px;
}

.evaluation-icon {
  display: flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f9edd9;
  color: #b17b20;
  font-size: 19px;
}

.evaluation-kicker {
  display: block;
  color: #b18a4e;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 1.8px;
}

.evaluation-head h3 {
  margin: 4px 0 0;
  font-size: 14px;
}

.evaluation-time {
  margin-left: auto;
  color: #aab6b2;
  font-size: 8px;
}

.evaluation-content {
  padding-top: 13px;
  margin-top: 13px;
  border-top: 1px solid #f1e8d8;
}

.evaluation-content p {
  margin: 0 0 9px;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.evaluation-content span {
  color: #9cadaa;
  font-size: 9px;
}

.evaluation-empty {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-top: 13px;
  margin-top: 13px;
  border-top: 1px solid #f1e8d8;
  color: #a4b3b0;
  font-size: 9px;
}

.evaluation-empty svg {
  width: 13px;
}

.editor-card {
  overflow: hidden;
}

.editor-section {
  padding: 26px 28px;
  border-bottom: 1px solid #edf3f1;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.section-index {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 9px;
  font-weight: 800;
}

.section-heading h3 {
  margin: 1px 0 5px;
  font-size: 15px;
  font-weight: 700;
}

.section-heading p {
  margin: 0;
  color: var(--muted);
  font-size: 9px;
}

.section-count {
  padding: 5px 8px;
  margin-left: auto;
  border-radius: 6px;
  background: #f1f5f4;
  color: var(--muted);
  font-size: 8px;
  font-weight: 700;
}

:deep(.el-textarea__inner) {
  min-height: 84px !important;
  padding: 12px 14px;
  border: 1px solid #e0eae7;
  border-radius: 11px;
  background: #fcfdfd;
  box-shadow: none;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.75;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.el-textarea__inner:hover) {
  border-color: #c7d9d5;
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(20, 163, 145, 0.08);
}

.is-readonly :deep(.el-textarea__inner) {
  background: #f8fbfa;
  color: var(--ink-soft);
}

.auto-fill-hint {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  margin-bottom: 10px;
  border: 1px solid #d9ece7;
  border-radius: 10px;
  background: #f2fbf8;
}

.auto-fill-icon {
  display: flex;
  width: 27px;
  height: 27px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #dff4ef;
  color: var(--brand-600);
  font-size: 14px;
}

.auto-fill-hint > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.auto-fill-hint strong {
  color: var(--brand-700);
  font-size: 10px;
}

.auto-fill-hint span {
  color: #78938d;
  font-size: 9px;
  line-height: 1.5;
}

.readonly-text {
  min-height: 92px;
  padding: 12px 14px;
  border: 1px solid #e0eae7;
  border-radius: 11px;
  background: #f8fbfa;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
}

.work-item-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.work-item {
  overflow: hidden;
  border: 1px solid #e3ece9;
  border-radius: 14px;
  background: #fff;
}

.work-item-head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 13px;
  border-bottom: 1px solid #edf3f1;
  background: #fafcfc;
}

.work-item-number {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--brand-900);
  color: var(--brand-400);
  font-size: 9px;
  font-weight: 800;
}

.work-item-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.work-item-title > span {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 700;
}

.nature-select {
  width: 112px;
}

.nature-select :deep(.el-select__wrapper) {
  min-height: 28px;
  padding: 1px 9px;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 0 0 1px #e0eae7 inset;
  font-size: 10px;
}

.work-item-head-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.work-item-progress {
  color: var(--brand-600);
  font-size: 11px;
  font-weight: 800;
}

.icon-btn {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #a7b7b3;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}

.icon-btn svg {
  width: 13px;
}

.icon-btn.danger:hover:not(:disabled) {
  background: #fdf0f0;
  color: #c55757;
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.work-item-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.field.full {
  width: 100%;
}

.field > span {
  color: #526965;
  font-size: 9px;
  font-weight: 700;
}

.field > span em {
  color: var(--danger);
  font-style: normal;
}

.field-row {
  display: grid;
  grid-template-columns: minmax(160px, 0.55fr) minmax(280px, 1.45fr);
  gap: 14px;
}

.progress-field {
  justify-content: flex-start;
}

.progress-editor {
  display: flex;
  height: 32px;
  align-items: center;
  gap: 14px;
}

.progress-editor :deep(.el-slider) {
  flex: 1;
  margin: 0 8px;
}

.progress-editor :deep(.el-slider__runway) {
  height: 5px;
  background: #eaf1ef;
}

.progress-editor :deep(.el-slider__bar) {
  height: 5px;
  background: linear-gradient(90deg, var(--brand-400), var(--brand-600));
}

.progress-editor :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid var(--brand-500);
}

.progress-editor strong {
  width: 34px;
  color: var(--brand-600);
  font-size: 11px;
  font-weight: 800;
  text-align: right;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-input-number .el-input__wrapper) {
  box-shadow: 0 0 0 1px #e0eae7 inset;
}

.add-item-btn {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 12px;
  border: 1px dashed #c7dcd7;
  border-radius: 11px;
  background: #fbfdfc;
  color: var(--brand-600);
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.add-item-btn:hover {
  border-color: var(--brand-500);
  background: var(--brand-50);
}

.add-item-btn svg {
  width: 12px;
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 28px;
  background: #fbfdfc;
}

.footer-summary {
  display: flex;
  align-items: center;
  gap: 14px;
}

.footer-summary div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.footer-summary span {
  color: var(--muted);
  font-size: 8px;
}

.footer-summary strong {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 700;
}

.footer-summary i {
  width: 1px;
  height: 24px;
  background: #e6eeec;
}

.footer-actions {
  display: flex;
  gap: 9px;
}

.footer-actions :deep(svg) {
  width: 13px;
  margin-right: 4px;
}

.locked-tip {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 9px;
}

.locked-tip svg {
  width: 13px;
}

@media (max-width: 1000px) {
  .meta-card {
    flex-direction: column;
  }

  .deadline-box {
    width: 100%;
  }

  .meta-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .period-select {
    width: 100%;
  }

  .heading-actions {
    width: 100%;
  }

  .editor-section {
    padding: 20px 16px;
  }

  .meta-card {
    padding: 20px;
  }

  .meta-stats {
    gap: 14px;
  }

  .editor-footer {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px 16px;
  }

  .footer-actions {
    width: 100%;
  }

  .footer-actions .el-button {
    flex: 1;
  }

  .work-item-title > span {
    display: none;
  }

  .work-item-head {
    gap: 8px;
  }
}
</style>
