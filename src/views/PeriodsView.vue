<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">REPORT PERIODS</span>
        <h1>周报周期</h1>
        <p>创建周报并设置填写时间，控制团队填报的起止范围。</p>
      </div>
      <div class="heading-actions">
        <el-button plain @click="openHistoryImport"><Upload /> 批量导入历史</el-button>
        <el-button type="primary" @click="openCreate"><Plus /> 新建周报周期</el-button>
      </div>
    </div>

    <div class="period-stats">
      <div class="mini-stat">
        <span class="mini-icon teal"><Calendar /></span>
        <div><strong>{{ periods.length }}</strong><span>周期总数</span></div>
      </div>
      <div class="mini-stat">
        <span class="mini-icon amber"><Timer /></span>
        <div><strong>{{ fillingCount }}</strong><span>正在填报</span></div>
      </div>
      <div class="mini-stat">
        <span class="mini-icon green"><DocumentChecked /></span>
        <div><strong>{{ totalSubmitted }}</strong><span>累计提交</span></div>
      </div>
      <div class="period-note">
        <InfoFilled />
        <span>“周报日期”用于导出文件名，“工作周期”用于 Excel 标题，请按团队既有习惯设置。</span>
      </div>
    </div>

    <section class="app-card table-card">
      <div class="table-head">
        <div>
          <h2>全部周期</h2>
          <p>管理员可随时调整填写时间，修改后立即生效。</p>
        </div>
        <el-button text :loading="loading" @click="loadPeriods"><Refresh /> 刷新</el-button>
      </div>

      <el-table v-loading="loading" :data="periods" row-key="id" class="period-table">
        <el-table-column label="周报日期" width="128">
          <template #default="{ row }">
            <div class="date-cell">
              <strong>{{ row.reportDate }}</strong>
              <span>{{ weekday(row.reportDate) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="工作周期" min-width="220">
          <template #default="{ row }">
            <div class="period-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ formatDate(row.periodStart) }} — {{ formatDate(row.periodEnd) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="填写时间" min-width="250">
          <template #default="{ row }">
            <div class="fill-time">
              <div><span>开始</span>{{ formatDateTime(row.fillStart) }}</div>
              <div><span>截止</span>{{ formatDateTime(row.fillEnd) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="104">
          <template #default="{ row }">
            <span class="status-pill" :class="phaseOf(row).className">{{ phaseOf(row).label }}</span>
          </template>
        </el-table-column>
        <el-table-column label="提交进度" width="170">
          <template #default="{ row }">
            <div class="submit-progress">
              <div class="progress-line">
                <div class="progress-track"><div class="progress-fill" :style="{ width: `${percent(row.submittedCount, row.employeeCount)}%` }"></div></div>
                <span>{{ percent(row.submittedCount, row.employeeCount) }}%</span>
              </div>
              <small>{{ row.submittedCount }} / {{ row.employeeCount }} 人 · 已评 {{ row.evaluatedCount }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="创建人" width="110">
          <template #default="{ row }">
            <span class="creator">{{ row.createdByName || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="92" fixed="right">
          <template #default="{ row }">
            <el-button text type="primary" @click="openEdit(row)"><Edit /> 编辑</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon"><Calendar /></div>
            <strong>还没有周报周期</strong>
            <span>点击右上角“新建周报周期”开始安排团队填报。</span>
          </div>
        </template>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑周报周期' : '新建周报周期'" width="620px" append-to-body destroy-on-close>
      <div class="dialog-note">
        <InfoFilled />
        <span>导出文件将命名为 <b>周报日期-综合技术服务组工作周报.xlsx</b>，Excel 内标题使用工作周期。</span>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="period-form">
        <el-form-item label="周报日期" prop="reportDate">
          <el-date-picker
            v-model="form.reportDate"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择周报日期"
            style="width: 100%"
          />
          <div class="form-hint">用于生成文件名，例如 20261023-综合技术服务组工作周报.xlsx。</div>
        </el-form-item>

        <div class="form-row">
          <el-form-item label="工作周期开始" prop="periodStart">
            <el-date-picker
              v-model="form.periodStart"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="开始日期"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="工作周期结束" prop="periodEnd">
            <el-date-picker
              v-model="form.periodEnd"
              type="date"
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="结束日期"
              style="width: 100%"
            />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="填写开始时间" prop="fillStart">
            <el-date-picker
              v-model="form.fillStart"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              placeholder="开始时间"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="填写截止时间" prop="fillEnd">
            <el-date-picker
              v-model="form.fillEnd"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm"
              placeholder="截止时间"
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <div class="form-hint block-hint">
          填写窗口内员工可保存草稿或提交；截止后内容锁定。管理员仍可审阅、评价和导出。
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">
          {{ editingId ? '保存修改' : '创建周期' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="historyDialogVisible" title="批量导入历史周报" width="620px" append-to-body destroy-on-close>
      <div class="history-note">
        <InfoFilled />
        <div>
          <strong>使用管理端导出的周报 Excel 批量导入</strong>
          <p>系统会读取 Excel 标题中的工作周期；如周期不存在会自动创建历史周期，填写窗口按工作周期开始/结束时间生成。</p>
        </div>
      </div>

      <input ref="historyFileInput" type="file" accept=".xlsx" class="hidden-file" @change="onHistoryFileChange" />
      <div class="history-file-box" :class="{ selected: historyFile }" @click="chooseHistoryFile">
        <UploadFilled />
        <strong>{{ historyFile ? historyFile.name : '选择或拖入 Excel 文件' }}</strong>
        <span>支持 .xlsx，最多 10MB；文件中可包含多个“填写人”区块</span>
      </div>

      <div class="history-rules">
        <span><i class="rule-dot"></i> 仅导入当前工作空间内姓名匹配的成员</span>
        <span><i class="rule-dot"></i> 已存在的同周期周报自动跳过，不会覆盖</span>
        <span><i class="rule-dot"></i> Excel 内的评价会一并写入，周报状态为已提交</span>
      </div>

      <div v-if="historyResult" class="history-result">
        <div class="history-result-head">
          <div>
            <span class="eyebrow">IMPORT RESULT</span>
            <h3>{{ historyResult.periodTitle }}</h3>
            <p>周报日期 {{ historyResult.reportDate }} · 共识别 {{ historyResult.totalBlocks }} 个区块</p>
          </div>
          <span class="result-badge" :class="{ warning: historyResult.importedCount === 0 }">
            {{ historyResult.importedCount > 0 ? '导入完成' : '没有新增' }}
          </span>
        </div>
        <div class="history-result-metrics">
          <div><strong>{{ historyResult.importedCount }}</strong><span>成功导入</span></div>
          <div><strong>{{ historyResult.skippedExistingCount }}</strong><span>已存在跳过</span></div>
          <div><strong>{{ historyResult.skippedUnknownCount }}</strong><span>人员未匹配</span></div>
          <div><strong>{{ historyResult.skippedEmptyCount }}</strong><span>空内容跳过</span></div>
        </div>
        <div v-if="historyResult.importedNames?.length" class="result-line success-line">
          <strong>已导入：</strong>{{ historyResult.importedNames.join('、') }}
        </div>
        <div v-if="historyResult.skippedExistingNames?.length" class="result-line">
          <strong>已存在跳过：</strong>{{ historyResult.skippedExistingNames.join('、') }}
        </div>
        <div v-if="historyResult.skippedUnknownNames?.length" class="result-line warning-line">
          <strong>未匹配成员：</strong>{{ historyResult.skippedUnknownNames.join('、') }}
        </div>
        <div v-if="historyResult.errors?.length" class="result-line warning-line">
          <strong>其他问题：</strong>{{ historyResult.errors.join('；') }}
        </div>
      </div>

      <template #footer>
        <el-button @click="historyDialogVisible = false">关闭</el-button>
        <el-button v-if="!historyResult" type="primary" :loading="importingHistory" :disabled="!historyFile" @click="submitHistoryImport">
          <Upload /> 开始导入
        </el-button>
        <el-button v-else type="primary" @click="historyDialogVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Calendar,
  DocumentChecked,
  Edit,
  InfoFilled,
  Plus,
  Refresh,
  Timer,
  Upload,
  UploadFilled
} from '@element-plus/icons-vue'
import { periodApi, reportApi } from '../api'
import {
  addDays,
  dateTimeString,
  formatDate,
  formatDateTime,
  percent,
  phaseOf,
  toDateString,
  todayString,
  weekday
} from '../utils/format'

const route = useRoute()
const router = useRouter()
const periods = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const formRef = ref()
const historyDialogVisible = ref(false)
const historyFileInput = ref()
const historyFile = ref(null)
const historyResult = ref(null)
const importingHistory = ref(false)

const form = reactive(defaultForm())

const rules = {
  reportDate: [{ required: true, message: '请选择周报日期', trigger: 'change' }],
  periodStart: [{ required: true, message: '请选择工作周期开始日期', trigger: 'change' }],
  periodEnd: [{ required: true, message: '请选择工作周期结束日期', trigger: 'change' }],
  fillStart: [{ required: true, message: '请选择填写开始时间', trigger: 'change' }],
  fillEnd: [{ required: true, message: '请选择填写截止时间', trigger: 'change' }]
}

const fillingCount = computed(() => periods.value.filter((item) => item.phase === 'FILLING').length)
const totalSubmitted = computed(() => periods.value.reduce((sum, item) => sum + Number(item.submittedCount || 0), 0))

onMounted(async () => {
  await loadPeriods()
  if (route.query.create === '1') {
    openCreate()
    router.replace('/periods')
  }
})

async function loadPeriods() {
  loading.value = true
  try {
    periods.value = await periodApi.list()
  } finally {
    loading.value = false
  }
}

function openHistoryImport() {
  historyFile.value = null
  historyResult.value = null
  historyDialogVisible.value = true
  if (historyFileInput.value) {
    historyFileInput.value.value = ''
  }
}

function chooseHistoryFile() {
  historyFileInput.value?.click()
}

function onHistoryFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    ElMessage.error('仅支持 .xlsx 格式的周报文件')
    event.target.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件不能超过 10MB')
    event.target.value = ''
    return
  }
  historyFile.value = file
  historyResult.value = null
}

async function submitHistoryImport() {
  if (!historyFile.value || importingHistory.value) return
  importingHistory.value = true
  try {
    historyResult.value = await reportApi.importHistory(historyFile.value)
    if (historyResult.value.importedCount > 0) {
      ElMessage.success(`成功导入 ${historyResult.value.importedCount} 份历史周报`)
    } else {
      ElMessage.warning('没有新增周报，请查看导入结果')
    }
    await loadPeriods()
  } finally {
    importingHistory.value = false
  }
}

function defaultForm() {
  const today = new Date()
  const day = today.getDay() || 7
  const monday = addDays(today, 1 - day)
  const friday = addDays(monday, 4)
  const fillStart = new Date(today)
  fillStart.setHours(9, 0, 0, 0)
  const fillEnd = addDays(today, 4)
  fillEnd.setHours(18, 0, 0, 0)
  return {
    reportDate: todayString(),
    periodStart: toDateString(monday),
    periodEnd: toDateString(friday),
    fillStart: dateTimeString(fillStart),
    fillEnd: dateTimeString(fillEnd)
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, defaultForm())
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    reportDate: row.reportDate,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    fillStart: row.fillStart,
    fillEnd: row.fillEnd
  })
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function validateDates() {
  if (form.periodStart > form.periodEnd) {
    ElMessage.warning('工作周期开始日期不能晚于结束日期')
    return false
  }
  if (form.fillStart > form.fillEnd) {
    ElMessage.warning('填写开始时间不能晚于截止时间')
    return false
  }
  return true
}

async function save() {
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  if (!validateDates()) return
  saving.value = true
  try {
    if (editingId.value) {
      await periodApi.update(editingId.value, { ...form })
      ElMessage.success('周报周期已更新')
    } else {
      await periodApi.create({ ...form })
      ElMessage.success('周报周期创建成功')
    }
    dialogVisible.value = false
    await loadPeriods()
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.period-stats {
  display: grid;
  grid-template-columns: repeat(3, 160px) minmax(280px, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 17px;
  border: 1px solid rgba(210, 225, 221, 0.85);
  border-radius: 15px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.mini-icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 17px;
}

.mini-icon.teal {
  background: #e5f6f2;
  color: #0f8b7d;
}

.mini-icon.amber {
  background: #fcf3e4;
  color: #bd861f;
}

.mini-icon.green {
  background: #eaf5ed;
  color: #3d8d63;
}

.mini-stat div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.mini-stat strong {
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.mini-stat span {
  color: var(--muted);
  font-size: 8px;
}

.period-note {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 15px 18px;
  border: 1px solid #eee3cf;
  border-radius: 15px;
  background: #fffcf5;
  color: #9b7c42;
  font-size: 9px;
  line-height: 1.6;
}

.period-note svg {
  width: 15px;
  flex-shrink: 0;
  color: #c59b54;
}

.table-card {
  padding: 24px;
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

.table-head :deep(svg) {
  width: 12px;
  margin-right: 4px;
}

.date-cell,
.period-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-cell strong {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
}

.date-cell span {
  color: var(--muted);
  font-size: 8px;
}

.period-cell strong {
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
}

.period-cell span {
  color: var(--muted);
  font-size: 8px;
}

.fill-time {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.fill-time div {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-soft);
  font-size: 9px;
}

.fill-time span {
  width: 28px;
  color: #9aada9;
  font-size: 8px;
}

.submit-progress {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.submit-progress small {
  color: var(--muted);
  font-size: 8px;
}

.creator {
  color: var(--muted);
  font-size: 9px;
}

.period-table :deep(.el-button) {
  font-size: 9px;
}

.period-table :deep(.el-button svg) {
  width: 11px;
}

.dialog-note {
  display: flex;
  gap: 9px;
  padding: 12px 14px;
  margin-bottom: 20px;
  border: 1px solid #e7eee9;
  border-radius: 10px;
  background: #f8fbfa;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.65;
}

.dialog-note svg {
  width: 14px;
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--brand-600);
}

.dialog-note b {
  color: var(--ink-soft);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.period-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.period-form :deep(.el-form-item__label) {
  padding-bottom: 6px;
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 700;
}

.block-hint {
  padding: 10px 12px;
  margin-top: -6px;
  border-radius: 8px;
  background: #f6faf9;
}

@media (max-width: 1100px) {
  .period-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .period-note {
    grid-column: 1 / -1;
  }
}

@media (max-width: 740px) {
  .period-stats {
    grid-template-columns: 1fr;
  }

  .table-card {
    padding: 16px;
    overflow-x: auto;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }
}

.hidden-file {
  display: none;
}

.history-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 15px;
  margin-bottom: 14px;
  border: 1px solid #e8e0ce;
  border-radius: 10px;
  background: #fffcf5;
  color: #8d7548;
}

.history-note > svg {
  width: 16px;
  flex-shrink: 0;
  margin-top: 1px;
  color: #c59b54;
}

.history-note strong {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
}

.history-note p {
  margin: 0;
  font-size: 9px;
  line-height: 1.7;
}

.history-file-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  min-height: 130px;
  padding: 20px;
  border: 1px dashed #cfe2dd;
  border-radius: 12px;
  background: #fbfdfc;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.history-file-box:hover,
.history-file-box.selected {
  border-color: var(--brand-500);
  background: #f5fcfa;
}

.history-file-box > svg {
  width: 30px;
  color: var(--brand-500);
}

.history-file-box strong {
  color: var(--ink-soft);
  font-size: 11px;
}

.history-file-box span {
  color: #9aada9;
  font-size: 8px;
}

.history-rules {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 13px 2px 0;
  color: #8fa39f;
  font-size: 8px;
}

.history-rules > span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--brand-400);
}

.history-result {
  margin-top: 16px;
  padding: 15px 16px;
  border: 1px solid #dcece8;
  border-radius: 12px;
  background: #f7fcfa;
}

.history-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.history-result-head h3 {
  margin: 4px 0 3px;
  font-size: 15px;
}

.history-result-head p {
  margin: 0;
  color: var(--muted);
  font-size: 8px;
}

.result-badge {
  padding: 4px 8px;
  border-radius: 6px;
  background: #e3f5ef;
  color: var(--brand-700);
  font-size: 8px;
  font-weight: 700;
}

.result-badge.warning {
  background: #fbf1df;
  color: #a17c3d;
}

.history-result-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 12px 0;
  margin: 10px 0;
  border-top: 1px solid #e1efeb;
  border-bottom: 1px solid #e1efeb;
}

.history-result-metrics div {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
}

.history-result-metrics strong {
  font-size: 19px;
  line-height: 1;
}

.history-result-metrics span {
  color: var(--muted);
  font-size: 8px;
}

.result-line {
  margin-top: 5px;
  color: var(--ink-soft);
  font-size: 9px;
  line-height: 1.6;
}

.result-line strong {
  color: var(--ink);
}

.success-line {
  color: var(--brand-700);
}

.warning-line {
  color: #a17c3d;
}

</style>
