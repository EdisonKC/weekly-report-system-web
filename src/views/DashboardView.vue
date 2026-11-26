<template>
  <div class="page-shell">
    <div class="welcome-row">
      <div>
        <span class="eyebrow">WORKSPACE OVERVIEW</span>
        <h1>{{ greetingText }}，{{ auth.displayName }}</h1>
        <p>这是本周的团队周报概览，关键进度与待办事项都在这里。</p>
      </div>
      <div class="welcome-actions">
        <el-button v-if="auth.isEmployee && activePeriod" type="primary" @click="goMyReport">
          <EditPen /> {{ myActionText }}
        </el-button>
        <el-button v-if="auth.isAdmin" type="primary" @click="goPeriods">
          <Plus /> 新建周报周期
        </el-button>
        <el-button v-if="auth.isAdmin" plain @click="goReports">
          <DocumentChecked /> 进入审阅
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="8" animated class="dashboard-skeleton" />
    <template v-else>
      <section class="hero-card">
        <div class="hero-content">
          <div class="hero-top">
            <span class="hero-kicker">CURRENT REPORT PERIOD</span>
            <span v-if="activePeriod" class="status-pill" :class="activePhase.className">
              {{ activePhase.label }}
            </span>
            <span v-else class="status-pill is-empty">暂无周期</span>
          </div>

          <template v-if="activePeriod">
            <h2>{{ activePeriod.title }}</h2>
            <div class="hero-meta">
              <div class="meta-item">
                <Calendar />
                <span>工作周期</span>
                <strong>{{ formatDate(activePeriod.periodStart) }} — {{ formatDate(activePeriod.periodEnd) }}</strong>
              </div>
              <div class="meta-item">
                <Clock />
                <span>填写窗口</span>
                <strong>{{ formatDateTime(activePeriod.fillStart) }} — {{ formatDateTime(activePeriod.fillEnd) }}</strong>
              </div>
            </div>

            <div class="hero-progress">
              <div class="hero-progress-head">
                <span>{{ auth.isEmployee ? '我的填报状态' : '团队提交进度' }}</span>
                <strong v-if="auth.isEmployee">{{ myStatusLabel }}</strong>
                <strong v-else>{{ activePeriod.submittedCount }} / {{ activePeriod.employeeCount }} 人</strong>
              </div>
              <div class="hero-track">
                <div class="hero-fill" :style="{ width: `${displayProgress}%` }"></div>
              </div>
              <div class="hero-progress-foot">
                <span>{{ auth.isEmployee ? myStatusHint : `已提交 ${activePeriod.submittedCount} 份，待评价 ${summary.pendingEvaluationCount} 份` }}</span>
                <span>{{ displayProgress }}%</span>
              </div>
            </div>

            <div class="hero-actions">
              <el-button v-if="auth.isEmployee" class="hero-primary" @click="goMyReport">
                <EditPen /> {{ myActionText }}
              </el-button>
              <el-button v-if="auth.isAdmin" class="hero-primary" @click="goReports">
                <DocumentChecked /> 审阅本期周报
              </el-button>
              <el-button v-if="auth.isAdmin" class="hero-ghost" @click="goPeriods">
                管理周期
              </el-button>
            </div>
          </template>

          <template v-else>
            <h2>还没有进行中的周报周期</h2>
            <p class="hero-empty-text">
              {{ auth.isAdmin ? '创建一个周报周期并设置填写时间，员工即可开始填报。' : '管理员尚未发布新的周报周期，请稍后再来查看。' }}
            </p>
            <el-button v-if="auth.isAdmin" class="hero-primary" @click="goPeriods">
              <Plus /> 立即创建
            </el-button>
          </template>
        </div>

        <div class="hero-side">
          <div class="hero-orbit orbit-one"></div>
          <div class="hero-orbit orbit-two"></div>
          <div class="hero-ring" :style="{ '--progress': `${displayProgress}%` }">
            <div class="hero-ring-inner">
              <strong>{{ displayProgress }}</strong>
              <span>%</span>
              <small>{{ auth.isEmployee ? 'MY STATUS' : 'SUBMITTED' }}</small>
            </div>
          </div>
          <div class="hero-side-note">
            <span class="dot"></span>
            {{ auth.isEmployee ? myStatusHint : '数据实时同步' }}
          </div>
        </div>
      </section>

      <section class="stat-grid">
        <article v-for="(stat, index) in statCards" :key="stat.label" class="stat-card" :style="{ animationDelay: `${index * 40}ms` }">
          <div class="stat-icon" :class="stat.tone"><component :is="stat.icon" /></div>
          <div class="stat-copy">
            <span>{{ stat.label }}</span>
            <strong>{{ stat.value }}</strong>
            <small>{{ stat.hint }}</small>
          </div>
          <div class="stat-trend" :class="stat.tone">{{ stat.badge }}</div>
        </article>
      </section>

      <section v-if="auth.isAdmin" class="lower-grid">
        <article class="app-card panel pending-panel">
          <div class="card-head">
            <div>
              <h2>待评价周报</h2>
              <p>本期已提交但尚未填写完成情况评价的周报</p>
            </div>
            <el-button text type="primary" @click="goReports">全部审阅 <ArrowRight /></el-button>
          </div>
          <div v-if="summary.pendingReports?.length" class="pending-list">
            <div v-for="item in summary.pendingReports" :key="item.userId" class="pending-row">
              <div class="avatar-chip">{{ initialOf(item.userName) }}</div>
              <div class="pending-user">
                <strong>{{ item.userName }}</strong>
                <span>{{ formatDateTime(item.submittedAt) }} 提交 · {{ item.itemCount }} 项工作</span>
              </div>
              <div class="pending-days"><strong>{{ item.totalDays }}</strong><span>天</span></div>
              <el-button size="small" type="primary" plain @click="openReview(item)">去评价</el-button>
            </div>
          </div>
          <div v-else class="empty-state compact-empty">
            <div class="empty-icon"><CircleCheck /></div>
            <strong>本期暂无待评价周报</strong>
            <span>员工提交后会出现在这里</span>
          </div>
        </article>

        <article class="app-card panel">
          <div class="card-head">
            <div>
              <h2>最近周期</h2>
              <p>周报周期的填写与提交情况</p>
            </div>
            <el-button text type="primary" @click="goPeriods">周期管理 <ArrowRight /></el-button>
          </div>
          <div class="period-list">
            <div v-for="period in summary.recentPeriods" :key="period.id" class="period-row">
              <div class="period-date">
                <strong>{{ formatMonthDay(period.reportDate) }}</strong>
                <span>{{ period.reportDate?.slice(0, 4) }}</span>
              </div>
              <div class="period-main">
                <strong>{{ period.title }}</strong>
                <span>{{ formatDate(period.periodStart) }} — {{ formatDate(period.periodEnd) }}</span>
              </div>
              <div class="period-side">
                <span class="status-pill" :class="phaseOf(period).className">{{ phaseOf(period).label }}</span>
                <small>{{ period.submittedCount }}/{{ period.employeeCount }} 已提交</small>
              </div>
            </div>
            <div v-if="!summary.recentPeriods?.length" class="empty-state compact-empty">
              <div class="empty-icon"><Calendar /></div>
              <strong>还没有周报周期</strong>
              <span>创建后即可开启填报</span>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="lower-grid employee-grid">
        <article class="app-card panel guide-panel">
          <div class="card-head">
            <div>
              <h2>填报指引</h2>
              <p>一份清晰的周报，让工作成果更容易被看见</p>
            </div>
            <div class="guide-icon"><TrendCharts /></div>
          </div>
          <div class="guide-steps">
            <div class="guide-step">
              <span>01</span>
              <div><strong>回顾上周计划</strong><p>对照上周目标，说明推进结果与偏差。</p></div>
            </div>
            <div class="guide-step">
              <span>02</span>
              <div><strong>拆解本周工作</strong><p>按工作性质逐项记录内容、时长与进度。</p></div>
            </div>
            <div class="guide-step">
              <span>03</span>
              <div><strong>说明问题与计划</strong><p>写清问题解法、遗留事项和下周安排。</p></div>
            </div>
          </div>
          <el-button class="guide-btn" type="primary" @click="goMyReport">
            {{ myActionText }} <ArrowRight />
          </el-button>
        </article>

        <article class="app-card panel">
          <div class="card-head">
            <div>
              <h2>历史周期</h2>
              <p>查看近期周报周期与填写状态</p>
            </div>
          </div>
          <div class="period-list">
            <div v-for="period in summary.recentPeriods" :key="period.id" class="period-row">
              <div class="period-date">
                <strong>{{ formatMonthDay(period.reportDate) }}</strong>
                <span>{{ period.reportDate?.slice(0, 4) }}</span>
              </div>
              <div class="period-main">
                <strong>{{ period.title }}</strong>
                <span>{{ formatDate(period.periodStart) }} — {{ formatDate(period.periodEnd) }}</span>
              </div>
              <div class="period-side">
                <span class="status-pill" :class="phaseOf(period).className">{{ phaseOf(period).label }}</span>
              </div>
            </div>
            <div v-if="!summary.recentPeriods?.length" class="empty-state compact-empty">
              <div class="empty-icon"><Calendar /></div>
              <strong>还没有历史周期</strong>
              <span>管理员发布后会出现在这里</span>
            </div>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRight,
  Calendar,
  CircleCheck,
  Clock,
  DataAnalysis,
  DocumentChecked,
  EditPen,
  Plus,
  TrendCharts,
  UserFilled
} from '@element-plus/icons-vue'
import { dashboardApi } from '../api'
import { useAuthStore } from '../stores/auth'
import {
  countdownText,
  formatDate,
  formatDateTime,
  formatMonthDay,
  greeting,
  initialOf,
  percent,
  phaseOf,
  reportStatusOf
} from '../utils/format'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(true)
const summary = ref({ recentPeriods: [], pendingReports: [] })

const greetingText = computed(() => greeting())
const activePeriod = computed(() => summary.value.activePeriod)
const activePhase = computed(() => phaseOf(activePeriod.value))
const myStatus = computed(() => summary.value.myReportStatus || 'NOT_STARTED')
const teamProgress = computed(() => {
  if (!activePeriod.value) return 0
  return percent(activePeriod.value.submittedCount, activePeriod.value.employeeCount)
})
const myCompletion = computed(() => (myStatus.value === 'SUBMITTED' ? 100 : 0))
const displayProgress = computed(() => (auth.isEmployee ? myCompletion.value : teamProgress.value))
const myStatusLabel = computed(() => summary.value.myReportStatusLabel || reportStatusOf(myStatus.value).label)
const myStatusHint = computed(() => {
  if (!activePeriod.value) return '暂无进行中的周期'
  if (activePeriod.value.phase === 'CLOSED') return '本期填写已截止'
  if (activePeriod.value.phase === 'UPCOMING') return '填写时间尚未开始'
  if (myStatus.value === 'SUBMITTED') return '已提交，等待管理员评价'
  if (myStatus.value === 'DRAFT') return '草稿已保存，记得提交'
  return countdownText(activePeriod.value.fillEnd)
})
const myActionText = computed(() => {
  if (myStatus.value === 'SUBMITTED') return '查看已提交周报'
  if (myStatus.value === 'DRAFT') return '继续填写'
  return '去填写周报'
})

const statCards = computed(() => {
  if (auth.isAdmin) {
    return [
      {
        label: '团队成员',
        value: summary.value.employeeCount || 0,
        hint: '当前启用成员账号',
        badge: 'TEAM',
        tone: 'teal',
        icon: UserFilled
      },
      {
        label: '本期已提交',
        value: activePeriod.value?.submittedCount || 0,
        hint: `共 ${activePeriod.value?.employeeCount || 0} 人应填`,
        badge: `${teamProgress.value}%`,
        tone: 'green',
        icon: DocumentChecked
      },
      {
        label: '待评价',
        value: summary.value.pendingEvaluationCount || 0,
        hint: '需要管理员反馈',
        badge: 'TODO',
        tone: 'amber',
        icon: EditPen
      },
      {
        label: '周报周期',
        value: summary.value.periodCount || 0,
        hint: '累计创建的周期',
        badge: 'TOTAL',
        tone: 'slate',
        icon: Calendar
      }
    ]
  }
  return [
    {
      label: '我的填报状态',
      value: myStatusLabel.value,
      hint: activePeriod.value ? activePeriod.value.title : '暂无进行中周期',
      badge: myStatus.value === 'SUBMITTED' ? 'DONE' : 'TODO',
      tone: myStatus.value === 'SUBMITTED' ? 'green' : 'amber',
      icon: EditPen
    },
    {
      label: '团队提交',
      value: `${activePeriod.value?.submittedCount || 0} / ${activePeriod.value?.employeeCount || 0}`,
      hint: '本期团队提交进度',
      badge: `${teamProgress.value}%`,
      tone: 'teal',
      icon: DataAnalysis
    },
    {
      label: '团队人数',
      value: summary.value.employeeCount || 0,
      hint: '综合技术服务组',
      badge: 'TEAM',
      tone: 'slate',
      icon: UserFilled
    },
    {
      label: '历史周期',
      value: summary.value.periodCount || 0,
      hint: '可查阅的周报周期',
      badge: 'TOTAL',
      tone: 'green',
      icon: Calendar
    }
  ]
})

onMounted(load)

async function load() {
  loading.value = true
  try {
    summary.value = await dashboardApi.summary()
  } finally {
    loading.value = false
  }
}

function goMyReport() {
  router.push({ path: '/my-report', query: activePeriod.value ? { periodId: activePeriod.value.id } : {} })
}

function goPeriods() {
  router.push('/periods')
}

function goReports() {
  router.push({ path: '/reports', query: activePeriod.value ? { periodId: activePeriod.value.id } : {} })
}


function openReview(item) {
  router.push({
    path: '/reports',
    query: {
      periodId: activePeriod.value?.id,
      reportId: item.reportId
    }
  })
}
</script>

<style scoped>
.welcome-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.welcome-row h1 {
  margin: 0 0 8px;
  font-size: clamp(24px, 2.4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.8px;
}

.welcome-row p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.welcome-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.welcome-actions :deep(svg) {
  width: 14px;
  margin-right: 4px;
}

.dashboard-skeleton {
  padding: 24px;
  border-radius: var(--radius-lg);
  background: #fff;
}

.hero-card {
  position: relative;
  display: grid;
  min-height: 330px;
  grid-template-columns: minmax(0, 1.65fr) minmax(260px, 0.75fr);
  gap: 30px;
  padding: 34px 38px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 88% 8%, rgba(46, 198, 177, 0.23), transparent 32%),
    linear-gradient(135deg, #123c37 0%, #0b2c29 58%, #082321 100%);
  color: #fff;
  box-shadow: 0 26px 60px rgba(10, 48, 43, 0.17);
}

.hero-card::before {
  position: absolute;
  inset: 0;
  content: '';
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(90deg, transparent, black);
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 17px;
}

.hero-kicker {
  color: rgba(219, 242, 236, 0.38);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 2.4px;
}

.hero-top .status-pill.is-filling {
  border: 1px solid rgba(46, 198, 177, 0.2);
  background: rgba(46, 198, 177, 0.12);
  color: #4ee0c9;
}

.hero-top .status-pill.is-upcoming {
  background: rgba(217, 168, 78, 0.14);
  color: #f2c778;
}

.hero-top .status-pill.is-closed,
.hero-top .status-pill.is-empty {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(235, 248, 244, 0.55);
}

.hero-content h2 {
  margin: 0 0 18px;
  font-size: clamp(27px, 3.1vw, 42px);
  font-weight: 300;
  letter-spacing: -1.2px;
}

.hero-meta {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  margin-bottom: 26px;
}

.meta-item {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 8px;
  align-items: center;
}

.meta-item > svg {
  width: 13px;
  color: var(--brand-400);
}

.meta-item span {
  color: rgba(219, 242, 236, 0.38);
  font-size: 9px;
}

.meta-item strong {
  grid-column: 2;
  color: rgba(239, 250, 247, 0.82);
  font-size: 10px;
  font-weight: 600;
}

.hero-progress {
  max-width: 520px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.hero-progress-head,
.hero-progress-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.hero-progress-head span {
  color: rgba(219, 242, 236, 0.45);
  font-size: 9px;
}

.hero-progress-head strong {
  font-size: 11px;
  font-weight: 700;
}

.hero-track {
  height: 5px;
  margin: 9px 0 7px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.09);
}

.hero-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand-400), #77ead7);
  box-shadow: 0 0 14px rgba(46, 198, 177, 0.4);
  transition: width 0.5s ease;
}

.hero-progress-foot {
  color: rgba(219, 242, 236, 0.33);
  font-size: 8px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.hero-primary {
  border: 0;
  background: var(--brand-400);
  color: #062c27;
  font-weight: 800;
}

.hero-primary:hover {
  background: #52dbc7;
  color: #062c27;
}

.hero-primary :deep(svg) {
  width: 14px;
  margin-right: 4px;
}

.hero-ghost {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(238, 250, 246, 0.7);
}

.hero-ghost:hover {
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.hero-empty-text {
  max-width: 480px;
  margin: 0 0 22px;
  color: rgba(219, 242, 236, 0.48);
  font-size: 12px;
  line-height: 1.8;
}

.hero-side {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.hero-orbit {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 50%;
}

.orbit-one {
  width: 250px;
  height: 250px;
}

.orbit-two {
  width: 310px;
  height: 310px;
  border-color: rgba(255, 255, 255, 0.035);
}

.hero-ring {
  display: flex;
  width: 188px;
  height: 188px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: conic-gradient(var(--brand-400) 0 var(--progress), rgba(255, 255, 255, 0.07) var(--progress) 100%);
  filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.15));
}

.hero-ring-inner {
  display: flex;
  width: 160px;
  height: 160px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  background: #0b2c29;
  flex-wrap: wrap;
  align-content: center;
}

.hero-ring-inner strong {
  font-size: 48px;
  font-weight: 300;
  letter-spacing: -2px;
  line-height: 1;
}

.hero-ring-inner span {
  margin-top: 2px;
  color: var(--brand-400);
  font-size: 16px;
}

.hero-ring-inner small {
  width: 100%;
  margin-top: 8px;
  color: rgba(219, 242, 236, 0.3);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 2px;
  text-align: center;
}

.hero-side-note {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  margin-top: 24px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.035);
  color: rgba(219, 242, 236, 0.36);
  font-size: 8px;
}

.hero-side-note .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--brand-400);
  box-shadow: 0 0 8px var(--brand-400);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.stat-card {
  display: flex;
  min-height: 118px;
  align-items: flex-start;
  gap: 13px;
  padding: 18px;
  border: 1px solid rgba(210, 225, 221, 0.85);
  border-radius: 17px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  animation: stat-in 0.4s ease both;
}

@keyframes stat-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  font-size: 18px;
}

.stat-icon.teal {
  background: #e5f6f2;
  color: #0f8b7d;
}

.stat-icon.green {
  background: #e9f5ed;
  color: #3d8d63;
}

.stat-icon.amber {
  background: #fcf3e4;
  color: #bd861f;
}

.stat-icon.slate {
  background: #eef2f1;
  color: #617874;
}

.stat-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.stat-copy > span {
  color: var(--muted);
  font-size: 10px;
}

.stat-copy strong {
  margin-top: 6px;
  color: var(--ink);
  font-size: 25px;
  font-weight: 700;
  letter-spacing: -0.6px;
  line-height: 1.1;
}

.stat-copy small {
  margin-top: 6px;
  color: #9cadaa;
  font-size: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-trend {
  padding: 3px 6px;
  border-radius: 5px;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.stat-trend.teal,
.stat-trend.green {
  background: #e9f6f3;
  color: #168c7b;
}

.stat-trend.amber {
  background: #fcf3e4;
  color: #b17c1d;
}

.stat-trend.slate {
  background: #f0f3f2;
  color: #6d817d;
}

.lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 18px;
  margin-top: 18px;
}

.employee-grid {
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
}

.panel {
  padding: 24px;
}

.panel .card-head {
  margin-bottom: 14px;
}

.panel .card-head :deep(svg) {
  width: 12px;
}

.pending-list,
.period-list {
  display: flex;
  flex-direction: column;
}

.pending-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid #f0f5f3;
}

.pending-row:last-child {
  border-bottom: 0;
}

.pending-user {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.pending-user strong {
  font-size: 12px;
  font-weight: 700;
}

.pending-user span {
  color: var(--muted);
  font-size: 9px;
}

.pending-days {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-right: 5px;
}

.pending-days strong {
  font-size: 15px;
  font-weight: 700;
}

.pending-days span {
  color: var(--muted);
  font-size: 8px;
}

.period-row {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 0;
  border-bottom: 1px solid #f0f5f3;
}

.period-row:last-child {
  border-bottom: 0;
}

.period-date {
  display: flex;
  width: 46px;
  height: 45px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f4f8f7;
  flex-direction: column;
}

.period-date strong {
  font-size: 11px;
  font-weight: 700;
  color: var(--brand-700);
}

.period-date span {
  margin-top: 2px;
  color: #a3b4b0;
  font-size: 7px;
}

.period-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 4px;
}

.period-main strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.period-main span {
  color: var(--muted);
  font-size: 8px;
}

.period-side {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 5px;
}

.period-side small {
  color: #9cadaa;
  font-size: 8px;
}

.compact-empty {
  padding: 28px 10px;
}

.compact-empty .empty-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 18px;
}

.guide-icon {
  display: flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--accent);
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 18px;
}

.guide-step {
  display: flex;
  gap: 12px;
  padding: 10px 0;
}

.guide-step > span {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 8px;
  font-weight: 800;
}

.guide-step strong {
  display: block;
  font-size: 11px;
}

.guide-step p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.5;
}

.guide-btn {
  width: 100%;
  border-radius: 10px;
}

.guide-btn :deep(svg) {
  width: 12px;
  margin-left: 5px;
}

@media (max-width: 1180px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .welcome-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-card {
    grid-template-columns: 1fr;
  }

  .hero-side {
    display: none;
  }

  .lower-grid,
  .employee-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }

  .hero-card {
    padding: 24px 20px;
    border-radius: 18px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-actions .el-button {
    width: 100%;
    margin-left: 0;
  }

  .hero-meta {
    gap: 16px;
  }

  .panel {
    padding: 18px;
  }
}
</style>
