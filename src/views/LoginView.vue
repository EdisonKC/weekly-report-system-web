<template>
  <div class="login-page">
    <section class="brand-panel">
      <div class="brand-glow brand-glow-a"></div>
      <div class="brand-glow brand-glow-b"></div>
      <div class="grid-overlay"></div>

      <div class="brand-top">
        <div class="brand-mark"><span></span><span></span><span></span></div>
        <div>
          <strong>综合技术服务组</strong>
          <small>WEEKLY REPORT SYSTEM</small>
        </div>
      </div>

      <div class="brand-main">
        <div class="brand-kicker"><span></span> 让每一周的工作都有迹可循</div>
        <h1>把团队的<br /><em>每一份投入</em><br />沉淀为清晰成果</h1>
        <p>
          从周计划、周执行到复盘评价，统一在线协作。管理员一键汇总导出，
          保持与团队既有 Excel 周报格式完全一致。
        </p>

        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon"><EditPen /></div>
            <div><strong>在线填报</strong><span>计划、进展、问题与下周安排</span></div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><DocumentChecked /></div>
            <div><strong>审阅评价</strong><span>逐人评价完成情况，及时反馈</span></div>
          </div>
          <div class="feature-item">
            <div class="feature-icon"><Download /></div>
            <div><strong>规范导出</strong><span>严格还原微软雅黑 Excel 模板</span></div>
          </div>
        </div>
      </div>

      <div class="preview-card">
        <div class="preview-head">
          <div>
            <span>WEEKLY SNAPSHOT</span>
            <strong>本周周报完成情况</strong>
          </div>
          <div class="preview-badge">填报中</div>
        </div>
        <div class="preview-body">
          <div class="preview-progress">
            <div class="preview-ring">
              <div class="ring-inner"><strong>72</strong><span>%</span></div>
            </div>
            <div class="preview-stat">
              <div><strong>12</strong><span>已提交</span></div>
              <div><strong>16</strong><span>团队人数</span></div>
            </div>
          </div>
          <div class="preview-lines">
            <div class="preview-line"><i class="done"></i><span>查询管控联调</span><em>100%</em></div>
            <div class="preview-line"><i class="doing"></i><span>放管服版本开发</span><em>80%</em></div>
            <div class="preview-line"><i class="doing"></i><span>试点环境保障</span><em>60%</em></div>
          </div>
        </div>
      </div>

      <div class="brand-foot">INTERNAL COLLABORATION · 仅限组内成员访问</div>
    </section>

    <section class="form-panel">
      <div class="mobile-brand">
        <div class="brand-mark"><span></span><span></span><span></span></div>
        <div><strong>综合技术服务组</strong><small>周报管理系统</small></div>
      </div>

      <div class="login-card">
        <div class="login-head">
          <span class="eyebrow">WELCOME BACK</span>
          <h2>登录工作空间</h2>
          <p>选择工作空间并使用对应账号进入系统</p>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="submit">
          <el-form-item label="工作空间" prop="workspaceId">
            <el-select v-model="form.workspaceId" size="large" placeholder="请选择工作空间" style="width: 100%">
              <el-option v-for="item in workspaceOptions" :key="item.id" :label="item.name" :value="item.id">
                <div class="workspace-option">
                  <span>{{ item.name }}</span>
                  <small>{{ item.description || '工作空间' }}</small>
                </div>
              </el-option>
              <template #prefix><OfficeBuilding /></template>
            </el-select>
          </el-form-item>
          <div v-if="selectedWorkspace" class="workspace-tip">
            <OfficeBuilding />
            <span>{{ selectedWorkspace.description || '当前工作空间' }}</span>
          </div>

          <el-form-item label="登录账号" prop="username">
            <el-input v-model="form.username" size="large" placeholder="请输入登录账号" autocomplete="username">
              <template #prefix><User /></template>
            </el-input>
          </el-form-item>
          <el-form-item label="登录密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              size="large"
              placeholder="请输入登录密码"
              show-password
              autocomplete="current-password"
            >
              <template #prefix><Lock /></template>
            </el-input>
          </el-form-item>

          <div class="form-meta">
            <span><Lock /> 账号由超级管理员统一创建</span>
          </div>

          <el-button class="login-btn" type="primary" size="large" :loading="auth.loading" @click="submit">
            <span>进入工作空间</span>
            <ArrowRight v-if="!auth.loading" />
          </el-button>
        </el-form>

        <div class="demo-box">
          <div class="demo-title"><span>演示账号</span><i></i></div>
          <div class="demo-list">
            <button
              v-for="item in demoAccounts"
              :key="item.username"
              class="demo-item"
              @click="fillDemo(item)"
            >
              <span class="demo-role" :class="item.tone">{{ item.role }}</span>
              <span class="demo-account">
                <strong>{{ item.username }}</strong>
                <small>{{ item.password }}</small>
              </span>
              <ArrowRight />
            </button>
          </div>
          <p class="demo-hint">点击账号可快速填入，方便体验不同角色权限</p>
        </div>
      </div>

      <div class="form-foot">© 2026 综合技术服务组 · 周报管理系统</div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  DocumentChecked,
  Download,
  EditPen,
  Lock,
  OfficeBuilding,
  User
} from '@element-plus/icons-vue'
import { authApi } from '../api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const formRef = ref()

const workspaceOptions = ref([])
const form = reactive({
  username: '',
  password: '',
  workspaceId: null
})

const selectedWorkspace = computed(() => workspaceOptions.value.find((item) => item.id === form.workspaceId))
const rules = {
  workspaceId: [{ required: true, message: '请选择工作空间', trigger: 'change' }],
  username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }]
}

onMounted(loadWorkspaces)

async function loadWorkspaces() {
  try {
    workspaceOptions.value = await authApi.workspaces()
    if (workspaceOptions.value.length && !form.workspaceId) {
      form.workspaceId = workspaceOptions.value[0].id
    }
  } catch (e) {
    // 错误提示由请求拦截器处理
  }
}

const demoAccounts = [
  { role: '超级管理员', tone: 'super', username: 'superadmin', password: 'Admin@123' },
  { role: '管理员', tone: 'admin', username: 'admin', password: 'Admin@123' },
  { role: '员工', tone: 'employee', username: 'quanxiwei', password: '123456' }
]

function fillDemo(item) {
  form.username = item.username
  form.password = item.password
  formRef.value?.clearValidate()
}

async function submit() {
  if (auth.loading) return
  if (!workspaceOptions.value.length) {
    await loadWorkspaces()
  }
  if (!workspaceOptions.value.length) {
    ElMessage.error('工作空间加载失败，请刷新页面后重试')
    return
  }
  try {
    await formRef.value.validate()
  } catch (e) {
    return
  }
  try {
    await auth.login({ ...form })
    ElMessage.success(`欢迎回来，${auth.displayName}`)
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' ? redirect : '/dashboard')
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  }
}
</script>

<style scoped>
.login-page {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 1.12fr) minmax(460px, 0.88fr);
  background: #f7faf9;
}

.brand-panel {
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  padding: 42px 54px 34px;
  overflow: hidden;
  background:
    radial-gradient(circle at 80% 8%, rgba(46, 198, 177, 0.2), transparent 34%),
    linear-gradient(155deg, #123d38 0%, #0b2d2a 52%, #071f1d 100%);
  color: #fff;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-image: linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at 40% 35%, black, transparent 76%);
}

.brand-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(1px);
  pointer-events: none;
}

.brand-glow-a {
  top: -180px;
  right: -140px;
  width: 420px;
  height: 420px;
  border: 1px solid rgba(46, 198, 177, 0.16);
  box-shadow: 0 0 120px rgba(46, 198, 177, 0.12) inset;
}

.brand-glow-b {
  bottom: 12%;
  left: -220px;
  width: 380px;
  height: 380px;
  border: 1px solid rgba(217, 168, 78, 0.1);
}

.brand-top,
.mobile-brand {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: flex;
  width: 43px;
  height: 43px;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.06);
}

.brand-mark span {
  display: block;
  height: 3px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--brand-400), rgba(46, 198, 177, 0.3));
}

.brand-mark span:nth-child(2) {
  width: 68%;
  background: var(--accent);
}

.brand-top strong,
.mobile-brand strong {
  display: block;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.brand-top small,
.mobile-brand small {
  display: block;
  margin-top: 4px;
  color: rgba(224, 243, 239, 0.42);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2.4px;
}

.brand-main {
  position: relative;
  z-index: 2;
  max-width: 590px;
  margin-top: clamp(50px, 9vh, 110px);
}

.brand-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  color: rgba(218, 241, 235, 0.55);
  font-size: 11px;
  letter-spacing: 1.2px;
}

.brand-kicker span {
  width: 22px;
  height: 1px;
  background: var(--accent);
}

.brand-main h1 {
  margin: 0;
  font-size: clamp(38px, 4.3vw, 62px);
  font-weight: 300;
  letter-spacing: -2px;
  line-height: 1.16;
}

.brand-main h1 em {
  color: var(--brand-400);
  font-style: normal;
  font-weight: 700;
}

.brand-main > p {
  max-width: 470px;
  margin: 24px 0 0;
  color: rgba(220, 240, 235, 0.55);
  font-size: 13px;
  line-height: 1.9;
}

.feature-list {
  display: grid;
  max-width: 560px;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 38px;
}

.feature-item {
  display: flex;
  gap: 10px;
  padding: 13px 12px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.035);
}

.feature-icon {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(46, 198, 177, 0.12);
  color: var(--brand-400);
  font-size: 13px;
}

.feature-item strong {
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.feature-item span {
  display: block;
  margin-top: 4px;
  color: rgba(218, 239, 233, 0.38);
  font-size: 8px;
  line-height: 1.45;
}

.preview-card {
  position: relative;
  z-index: 2;
  width: min(440px, 100%);
  padding: 17px 18px;
  margin-top: auto;
  margin-left: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 17px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.035));
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(12px);
}

.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.preview-head span {
  display: block;
  color: rgba(218, 241, 235, 0.35);
  font-size: 7px;
  font-weight: 700;
  letter-spacing: 2px;
}

.preview-head strong {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
}

.preview-badge {
  padding: 5px 9px;
  border: 1px solid rgba(46, 198, 177, 0.25);
  border-radius: 99px;
  background: rgba(46, 198, 177, 0.11);
  color: var(--brand-400);
  font-size: 8px;
  font-weight: 700;
}

.preview-body {
  display: flex;
  gap: 24px;
  align-items: center;
  margin-top: 16px;
}

.preview-ring {
  display: flex;
  width: 78px;
  height: 78px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: conic-gradient(var(--brand-400) 0 72%, rgba(255, 255, 255, 0.08) 72% 100%);
}

.ring-inner {
  display: flex;
  width: 62px;
  height: 62px;
  align-items: baseline;
  justify-content: center;
  border-radius: 50%;
  background: #0d302c;
}

.ring-inner strong {
  font-size: 22px;
  font-weight: 700;
}

.ring-inner span {
  color: var(--brand-400);
  font-size: 9px;
}

.preview-stat {
  display: flex;
  gap: 24px;
}

.preview-stat strong {
  display: block;
  font-size: 18px;
}

.preview-stat span {
  display: block;
  margin-top: 3px;
  color: rgba(218, 239, 233, 0.36);
  font-size: 8px;
}

.preview-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
}

.preview-line {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 8px;
  color: rgba(229, 245, 241, 0.6);
}

.preview-line i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.preview-line i.done {
  background: var(--brand-400);
}

.preview-line i.doing {
  background: var(--accent);
}

.preview-line span {
  flex: 1;
}

.preview-line em {
  color: rgba(229, 245, 241, 0.38);
  font-style: normal;
}

.brand-foot {
  position: relative;
  z-index: 2;
  margin-top: 22px;
  color: rgba(218, 241, 235, 0.2);
  font-size: 7px;
  letter-spacing: 2px;
}

.form-panel {
  position: relative;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 42px clamp(28px, 5vw, 88px);
  background:
    radial-gradient(circle at 100% 0%, rgba(46, 198, 177, 0.08), transparent 30%),
    #f7faf9;
}

.mobile-brand {
  display: none;
}

.login-card {
  width: min(390px, 100%);
  animation: card-in 0.45s ease both;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-head {
  margin-bottom: 30px;
}

.login-head .eyebrow {
  margin-bottom: 14px;
}

.login-head h2 {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.8px;
}

.login-head p {
  margin: 9px 0 0;
  color: var(--muted);
  font-size: 12px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  padding-bottom: 7px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
}

:deep(.el-input__wrapper) {
  padding: 3px 14px;
  border: 1px solid #dce8e5;
  border-radius: 11px;
  background: #fff;
  box-shadow: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

:deep(.el-input__wrapper:hover) {
  border-color: #bcd3ce;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: var(--brand-500);
  box-shadow: 0 0 0 3px rgba(20, 163, 145, 0.1);
}

:deep(.el-input__inner) {
  height: 42px;
  font-size: 13px;
}

:deep(.el-input__prefix-inner svg) {
  width: 15px;
  color: #9bb0ac;
}

.workspace-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
}

.workspace-option small {
  color: #9aada9;
  font-size: 9px;
}

.workspace-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  margin: -10px 0 18px;
  border-radius: 8px;
  background: var(--brand-50);
  color: #78938d;
  font-size: 9px;
}

.workspace-tip svg {
  width: 13px;
  flex-shrink: 0;
  color: var(--brand-600);
}

.form-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 22px;
}

.form-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #9aada9;
  font-size: 9px;
}

.form-meta svg {
  width: 11px;
}

.login-btn {
  width: 100%;
  height: 50px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
  box-shadow: 0 14px 28px rgba(13, 105, 95, 0.24);
  font-size: 13px;
  letter-spacing: 0.5px;
}

.login-btn :deep(span) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.login-btn svg {
  width: 15px;
}

.demo-box {
  padding: 16px;
  margin-top: 30px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.65);
}

.demo-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.demo-title span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  white-space: nowrap;
}

.demo-title i {
  width: 100%;
  height: 1px;
  background: var(--line);
}

.demo-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.demo-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
  transition: background 0.18s ease;
}

.demo-item:hover {
  background: var(--brand-50);
}

.demo-role {
  width: 60px;
  flex-shrink: 0;
  padding: 4px 0;
  border-radius: 5px;
  font-size: 8px;
  font-weight: 700;
  text-align: center;
}

.demo-role.super {
  background: #f7ecda;
  color: #a46d16;
}

.demo-role.admin {
  background: var(--brand-100);
  color: var(--brand-700);
}

.demo-role.employee {
  background: #eef2f1;
  color: #647b76;
}

.demo-account {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.demo-account strong {
  font-size: 10px;
  font-weight: 600;
}

.demo-account small {
  color: #9aada9;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
}

.demo-item > svg {
  width: 11px;
  color: #b9c9c5;
}

.demo-hint {
  margin: 10px 0 0;
  color: #a3b4b0;
  font-size: 8px;
  text-align: center;
}

.form-foot {
  position: absolute;
  bottom: 24px;
  color: #a7b8b4;
  font-size: 8px;
  letter-spacing: 0.3px;
}

@media (max-width: 1060px) {
  .login-page {
    grid-template-columns: minmax(0, 1fr) minmax(420px, 0.9fr);
  }

  .brand-panel {
    padding: 34px 36px 28px;
  }

  .feature-list {
    grid-template-columns: 1fr;
    max-width: 300px;
  }

  .preview-card {
    width: 100%;
  }
}

@media (max-width: 820px) {
  .login-page {
    display: block;
  }

  .brand-panel {
    display: none;
  }

  .form-panel {
    min-height: 100vh;
    align-items: flex-start;
    padding: 28px 24px 60px;
  }

  .mobile-brand {
    display: flex;
    width: 100%;
    max-width: 390px;
    margin: 0 auto 50px;
  }

  .mobile-brand .brand-mark {
    border-color: rgba(13, 91, 83, 0.15);
    background: var(--brand-900);
  }

  .mobile-brand strong {
    color: var(--ink);
  }

  .mobile-brand small {
    color: var(--muted);
  }

  .login-card {
    margin: 0 auto;
  }

  .form-foot {
    display: none;
  }
}
</style>
