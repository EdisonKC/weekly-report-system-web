<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ 'is-open': mobileOpen }">
      <div class="brand">
        <div class="brand-mark">
          <span></span><span></span><span></span>
        </div>
        <div class="brand-copy">
          <strong>综合技术服务组</strong>
          <small>WEEKLY REPORT</small>
        </div>
      </div>

      <div class="side-label">功能导航</div>
      <nav class="side-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: route.path === item.path }"
          @click="mobileOpen = false"
        >
          <span class="nav-icon"><component :is="item.icon" /></span>
          <span class="nav-text">{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          <span class="nav-arrow"><ArrowRight /></span>
        </RouterLink>
      </nav>

      <div class="side-note">
        <div class="side-note-icon"><Lock /></div>
        <div>
          <strong>内部数据空间</strong>
          <p>周报仅限组内成员与管理员可见</p>
        </div>
      </div>

      <div class="side-footer">
        <div class="profile-card">
          <div class="profile-avatar">{{ initialOf(auth.displayName) }}</div>
          <div class="profile-meta">
            <strong>{{ auth.displayName }}</strong>
            <span>{{ auth.roleLabel }}</span>
          </div>
          <el-tooltip content="退出登录" placement="top">
            <button class="logout-btn" @click="logout"><SwitchButton /></button>
          </el-tooltip>
        </div>
      </div>
    </aside>

    <div v-if="mobileOpen" class="sidebar-mask" @click="mobileOpen = false"></div>

    <div class="main-area">
      <header class="topbar">
        <button class="menu-btn" @click="mobileOpen = !mobileOpen">
          <Close v-if="mobileOpen" />
          <Fold v-else />
        </button>
        <div class="topbar-title">
          <span class="top-eyebrow">{{ route.meta.eyebrow }}</span>
          <h2>{{ route.meta.title }}</h2>
        </div>
        <div class="topbar-actions">
          <div class="workspace-chip">
            <OfficeBuilding />
            <span>{{ auth.workspaceName }}</span>
          </div>
          <div class="today-chip">
            <Calendar />
            <span>{{ todayText }}</span>
          </div>
          <div class="top-user">
            <div class="top-avatar">{{ initialOf(auth.displayName) }}</div>
            <div class="top-user-copy">
              <strong>{{ auth.displayName }}</strong>
              <span>{{ auth.roleLabel }}</span>
            </div>
          </div>
        </div>
      </header>

      <main class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  Calendar,
  Clock,
  Close,
  DocumentChecked,
  EditPen,
  Fold,
  HomeFilled,
  Lock,
  OfficeBuilding,
  SwitchButton,
  UserFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import { initialOf } from '../utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)

const navItems = computed(() => {
  const items = [{ path: '/dashboard', label: '工作台', icon: HomeFilled }]
  items.push({ path: '/my-report', label: '我的周报', icon: EditPen })
  items.push({ path: '/my-history', label: '历史周报', icon: Clock })
  if (auth.isAdmin) {
    items.push({ path: '/periods', label: '周报周期', icon: Calendar })
    items.push({ path: '/reports', label: '周报审阅', icon: DocumentChecked })
  }
  if (auth.isSuperAdmin) {
    items.push({ path: '/workspaces', label: '工作空间', icon: OfficeBuilding })
    items.push({ path: '/users', label: '用户管理', icon: UserFilled })
  }
  return items
})

const todayText = computed(() => {
  const date = new Date()
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${week}`
})

async function logout() {
  try {
    await ElMessageBox.confirm('退出后需要重新登录，确定要退出吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    auth.logout()
    router.replace('/login')
  } catch (e) {
    // 用户取消
  }
}
</script>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at 82% -10%, rgba(46, 198, 177, 0.12), transparent 32%),
    var(--bg);
}

.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  width: 248px;
  flex-direction: column;
  padding: 26px 18px 18px;
  overflow-y: auto;
  background:
    radial-gradient(circle at 10% 0%, rgba(46, 198, 177, 0.2), transparent 30%),
    linear-gradient(165deg, #123b36 0%, #0c2b28 48%, #071f1d 100%);
  color: #eaf6f3;
}

.sidebar::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(to bottom, black, transparent 68%);
}

.brand {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px;
  margin-bottom: 38px;
}

.brand-mark {
  display: flex;
  width: 42px;
  height: 42px;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.07);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.brand-mark span {
  display: block;
  height: 3px;
  border-radius: 99px;
  background: linear-gradient(90deg, var(--brand-400), rgba(46, 198, 177, 0.35));
}

.brand-mark span:nth-child(2) {
  width: 66%;
  background: var(--accent);
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.brand-copy strong {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-copy small {
  margin-top: 4px;
  color: rgba(226, 245, 240, 0.44);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2.2px;
}

.side-label {
  position: relative;
  z-index: 1;
  padding: 0 12px;
  margin-bottom: 10px;
  color: rgba(213, 238, 232, 0.4);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
}

.side-nav {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  color: rgba(224, 243, 239, 0.66);
  font-size: 13px;
  font-weight: 600;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.055);
  color: #fff;
}

.nav-item.active {
  border-color: rgba(46, 198, 177, 0.22);
  background: linear-gradient(90deg, rgba(46, 198, 177, 0.2), rgba(46, 198, 177, 0.07));
  color: #fff;
  box-shadow: inset 3px 0 0 var(--brand-400);
}

.nav-icon {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  color: rgba(224, 243, 239, 0.55);
  font-size: 17px;
}

.nav-item.active .nav-icon {
  color: var(--brand-400);
}

.nav-text {
  flex: 1;
}

.nav-arrow {
  color: rgba(224, 243, 239, 0.2);
  font-size: 12px;
  transition: transform 0.2s ease, color 0.2s ease;
}

.nav-item:hover .nav-arrow,
.nav-item.active .nav-arrow {
  color: rgba(255, 255, 255, 0.55);
  transform: translateX(2px);
}

.side-note {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  padding: 14px;
  margin: auto 4px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
}

.side-note-icon {
  display: flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(217, 168, 78, 0.14);
  color: var(--accent);
  font-size: 13px;
}

.side-note strong {
  font-size: 11px;
  color: rgba(235, 249, 245, 0.9);
}

.side-note p {
  margin: 4px 0 0;
  color: rgba(218, 239, 233, 0.4);
  font-size: 9px;
  line-height: 1.55;
}

.side-footer {
  position: relative;
  z-index: 1;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.055);
}

.profile-avatar,
.top-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--brand-400), var(--brand-600));
  color: #042522;
  font-weight: 800;
}

.profile-avatar {
  width: 34px;
  height: 34px;
  font-size: 13px;
}

.profile-meta {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.profile-meta strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-meta span {
  margin-top: 3px;
  color: rgba(218, 239, 233, 0.44);
  font-size: 9px;
}

.logout-btn {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: rgba(218, 239, 233, 0.48);
  cursor: pointer;
  font-size: 15px;
  transition: background 0.2s ease, color 0.2s ease;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.main-area {
  width: calc(100% - 248px);
  margin-left: 248px;
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 18px;
  height: 82px;
  padding: 0 34px;
  border-bottom: 1px solid rgba(215, 228, 224, 0.75);
  background: rgba(242, 246, 245, 0.83);
  backdrop-filter: blur(18px);
}

.menu-btn {
  display: none;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--ink-soft);
  cursor: pointer;
}

.topbar-title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.top-eyebrow {
  color: var(--brand-600);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 2.2px;
}

.topbar-title h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-left: auto;
}

.workspace-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 8px 11px;
  border: 1px solid rgba(20, 163, 145, 0.18);
  border-radius: 10px;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 10px;
  font-weight: 600;
}

.workspace-chip svg {
  width: 13px;
  flex-shrink: 0;
}

.workspace-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--muted);
  font-size: 11px;
}

.today-chip svg {
  width: 13px;
  color: var(--brand-600);
}

.top-user {
  display: flex;
  align-items: center;
  gap: 9px;
}

.top-avatar {
  width: 34px;
  height: 34px;
  font-size: 12px;
}

.top-user-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.top-user-copy strong {
  font-size: 11px;
  font-weight: 700;
}

.top-user-copy span {
  color: var(--muted);
  font-size: 9px;
}

.content {
  padding: 30px 34px 46px;
}

.sidebar-mask {
  position: fixed;
  inset: 0;
  z-index: 35;
  background: rgba(7, 31, 29, 0.5);
  backdrop-filter: blur(3px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 1080px) {
  .today-chip {
    display: none;
  }
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.26s ease;
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .main-area {
    width: 100%;
    margin-left: 0;
  }

  .topbar {
    height: 70px;
    padding: 0 18px;
  }

  .menu-btn {
    display: flex;
  }

  .content {
    padding: 20px 16px 36px;
  }

  .top-user-copy {
    display: none;
  }
}
</style>
