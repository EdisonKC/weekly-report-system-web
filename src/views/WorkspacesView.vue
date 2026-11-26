<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">WORKSPACE MANAGEMENT</span>
        <h1>工作空间管理</h1>
        <p>创建和删除工作空间，管理成员及成员在各工作空间内的角色。</p>
      </div>
      <div class="heading-actions">
        <el-button type="primary" @click="openCreateWorkspace"><Plus /> 新建工作空间</el-button>
      </div>
    </div>

    <div class="workspace-summary">
      <div class="summary-card">
        <div class="summary-icon teal"><OfficeBuilding /></div>
        <div><strong>{{ workspaces.length }}</strong><span>工作空间总数</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-icon green"><UserFilled /></div>
        <div><strong>{{ totalMembers }}</strong><span>成员总数</span></div>
      </div>
      <div class="summary-card">
        <div class="summary-icon amber"><Management /></div>
        <div><strong>{{ totalAdmins }}</strong><span>空间管理员</span></div>
      </div>
      <div class="summary-note">
        <InfoFilled />
        <span>删除工作空间会同时删除该空间下的周报周期、周报和成员关系，请谨慎操作。</span>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated class="app-card loading-card" />
    <div v-else-if="!workspaces.length" class="app-card">
      <div class="empty-state">
        <div class="empty-icon"><OfficeBuilding /></div>
        <strong>还没有工作空间</strong>
        <span>创建第一个工作空间后，即可添加成员并开始使用周报功能。</span>
      </div>
    </div>

    <div v-else class="workspace-grid">
      <article v-for="workspace in workspaces" :key="workspace.id" class="workspace-card">
        <div class="workspace-card-head">
          <div class="workspace-logo"><OfficeBuilding /></div>
          <div class="workspace-title">
            <div class="workspace-name-row">
              <h2>{{ workspace.name }}</h2>
              <span v-if="workspace.id === auth.workspace?.id" class="current-tag">当前空间</span>
            </div>
            <p>{{ workspace.description || '暂无描述' }}</p>
          </div>
          <el-dropdown trigger="click" @command="(command) => handleWorkspaceCommand(command, workspace)">
            <button class="more-btn"><MoreFilled /></button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="members"><UserFilled /> 管理成员</el-dropdown-item>
                <el-dropdown-item command="edit"><Edit /> 编辑信息</el-dropdown-item>
                <el-dropdown-item command="delete" divided><Delete /> 删除工作空间</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="workspace-metrics">
          <div><strong>{{ workspace.memberCount }}</strong><span>成员</span></div>
          <div><strong>{{ workspace.employeeCount }}</strong><span>员工</span></div>
          <div><strong>{{ workspace.adminCount }}</strong><span>管理员</span></div>
          <div><strong>{{ workspace.periodCount }}</strong><span>周报周期</span></div>
        </div>

        <div class="workspace-foot">
          <span><Clock /> 创建于 {{ formatDate(workspace.createdAt) }}</span>
          <el-button text type="primary" @click="openMembers(workspace)">
            <Setting /> 管理成员
          </el-button>
        </div>
      </article>
    </div>

    <el-dialog
      v-model="workspaceDialogVisible"
      :title="editingWorkspace ? '编辑工作空间' : '新建工作空间'"
      width="500px"
      append-to-body
      destroy-on-close
    >
      <el-form ref="workspaceFormRef" :model="workspaceForm" :rules="workspaceRules" label-position="top">
        <el-form-item label="工作空间名称" prop="name">
          <el-input v-model="workspaceForm.name" maxlength="60" show-word-limit placeholder="例如：综合技术服务组" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="workspaceForm.description" type="textarea" :rows="3" maxlength="255" show-word-limit placeholder="简单说明该工作空间的用途" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="workspaceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingWorkspace" @click="saveWorkspace">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="memberDrawerVisible" :size="drawerSize" append-to-body destroy-on-close>
      <template #header>
        <div class="drawer-title">
          <div class="drawer-icon"><OfficeBuilding /></div>
          <div>
            <strong>{{ activeWorkspace?.name }}</strong>
            <span>工作空间成员管理</span>
          </div>
        </div>
      </template>

      <div class="member-toolbar">
        <div>
          <h3>成员列表</h3>
          <p>共 {{ members.length }} 位成员 · 管理员 {{ memberAdminCount }} 位</p>
        </div>
        <el-button type="primary" @click="openAddMember"><Plus /> 添加成员</el-button>
      </div>

      <el-table v-loading="memberLoading" :data="members" row-key="userId" class="member-table">
        <el-table-column label="成员" min-width="200">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar-chip">{{ initialOf(row.realName) }}</div>
              <div>
                <div class="user-name">{{ row.realName }}</div>
                <div class="user-account">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="空间角色" width="150">
          <template #default="{ row }">
            <el-select
              :model-value="row.role"
              size="small"
              class="role-select"
              @change="(role) => changeMemberRole(row, role)"
            >
              <el-option label="员工" value="EMPLOYEE" />
              <el-option label="管理员" value="ADMIN" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="加入时间" width="130">
          <template #default="{ row }">
            <span class="member-time">{{ formatDate(row.joinedAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button text type="danger" @click="removeMember(row)"><Delete /> 移除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state compact-empty">
            <div class="empty-icon"><UserFilled /></div>
            <strong>暂无成员</strong>
            <span>点击“添加成员”为工作空间添加员工。</span>
          </div>
        </template>
      </el-table>

      <div class="member-foot">
        <span>管理员可管理周期、审阅评价和导出；员工可填写本空间周报。</span>
      </div>
    </el-drawer>

    <el-dialog v-model="memberDialogVisible" title="添加成员" width="560px" append-to-body destroy-on-close>
      <div class="mode-tabs">
        <button :class="{ active: memberMode === 'existing' }" @click="memberMode = 'existing'">添加已有账号</button>
        <button :class="{ active: memberMode === 'new' }" @click="memberMode = 'new'">新建员工并加入</button>
      </div>

      <el-form v-if="memberMode === 'existing'" ref="existingFormRef" :model="existingForm" :rules="existingRules" label-position="top">
        <el-form-item label="选择账号" prop="userId">
          <el-select v-model="existingForm.userId" filterable placeholder="请选择要加入工作空间的账号" style="width: 100%">
            <el-option v-for="user in availableUsers" :key="user.id" :label="`${user.realName}（${user.username}）`" :value="user.id" />
          </el-select>
          <div v-if="!availableUsers.length" class="form-hint">暂无可添加的账号，可以在“新建员工并加入”中创建。</div>
        </el-form-item>
        <el-form-item label="空间角色" prop="role">
          <el-radio-group v-model="existingForm.role">
            <el-radio-button value="EMPLOYEE">员工</el-radio-button>
            <el-radio-button value="ADMIN">管理员</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-form v-else ref="newMemberFormRef" :model="newMemberForm" :rules="newMemberRules" label-position="top">
        <div class="form-row">
          <el-form-item label="员工姓名" prop="realName">
            <el-input v-model="newMemberForm.realName" placeholder="请输入员工姓名" />
          </el-form-item>
          <el-form-item label="登录账号" prop="username">
            <el-input v-model="newMemberForm.username" placeholder="字母、数字或下划线" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="初始密码" prop="password">
            <el-input v-model="newMemberForm.password" type="password" show-password placeholder="至少 6 位" />
          </el-form-item>
          <el-form-item label="空间角色" prop="role">
            <el-select v-model="newMemberForm.role" style="width: 100%">
              <el-option label="员工" value="EMPLOYEE" />
              <el-option label="管理员" value="ADMIN" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="排序（可选）" prop="sortNo">
          <el-input-number v-model="newMemberForm.sortNo" :min="0" :max="9999" controls-position="right" placeholder="自动排序" style="width: 100%" />
        </el-form-item>
        <div class="form-hint">排序用于该员工的周报导出顺序，数值越小越靠前。</div>
      </el-form>

      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="addingMember" @click="submitMember">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Clock,
  Delete,
  Edit,
  InfoFilled,
  Management,
  MoreFilled,
  OfficeBuilding,
  Plus,
  Setting,
  UserFilled
} from '@element-plus/icons-vue'
import { workspaceApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { formatDate, initialOf } from '../utils/format'

const router = useRouter()
const auth = useAuthStore()
const workspaces = ref([])
const loading = ref(false)
const savingWorkspace = ref(false)
const workspaceDialogVisible = ref(false)
const editingWorkspace = ref(null)
const workspaceFormRef = ref()
const workspaceForm = reactive({ name: '', description: '' })

const memberDrawerVisible = ref(false)
const memberLoading = ref(false)
const activeWorkspace = ref(null)
const members = ref([])
const availableUsers = ref([])
const memberDialogVisible = ref(false)
const memberMode = ref('existing')
const addingMember = ref(false)
const existingFormRef = ref()
const newMemberFormRef = ref()
const existingForm = reactive({ userId: null, role: 'EMPLOYEE' })
const newMemberForm = reactive({ realName: '', username: '', password: '', sortNo: null, role: 'EMPLOYEE' })
const isMobile = ref(window.innerWidth < 820)

const workspaceRules = {
  name: [{ required: true, message: '请输入工作空间名称', trigger: 'blur' }]
}
const existingRules = {
  userId: [{ required: true, message: '请选择账号', trigger: 'change' }]
}
const newMemberRules = {
  realName: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  username: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{3,32}$/, message: '账号需为 3-32 位字母、数字或下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度需为 6-32 位', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择空间角色', trigger: 'change' }]
}

const totalMembers = computed(() => workspaces.value.reduce((sum, item) => sum + Number(item.memberCount || 0), 0))
const totalAdmins = computed(() => workspaces.value.reduce((sum, item) => sum + Number(item.adminCount || 0), 0))
const memberAdminCount = computed(() => members.value.filter((item) => item.role === 'ADMIN').length)
const drawerSize = computed(() => (isMobile.value ? '100%' : '760px'))

onMounted(() => {
  window.addEventListener('resize', updateViewport)
  loadWorkspaces()
})

onUnmounted(() => window.removeEventListener('resize', updateViewport))

function updateViewport() {
  isMobile.value = window.innerWidth < 820
}

async function loadWorkspaces() {
  loading.value = true
  try {
    workspaces.value = await workspaceApi.list()
  } finally {
    loading.value = false
  }
}

function openCreateWorkspace() {
  editingWorkspace.value = null
  workspaceForm.name = ''
  workspaceForm.description = ''
  workspaceDialogVisible.value = true
}

function openEditWorkspace(workspace) {
  editingWorkspace.value = workspace
  workspaceForm.name = workspace.name
  workspaceForm.description = workspace.description || ''
  workspaceDialogVisible.value = true
}

async function saveWorkspace() {
  try {
    await workspaceFormRef.value.validate()
  } catch (e) {
    return
  }
  savingWorkspace.value = true
  try {
    if (editingWorkspace.value) {
      await workspaceApi.update(editingWorkspace.value.id, { ...workspaceForm })
      ElMessage.success('工作空间已更新')
    } else {
      await workspaceApi.create({ ...workspaceForm })
      ElMessage.success('工作空间已创建')
    }
    workspaceDialogVisible.value = false
    await loadWorkspaces()
  } finally {
    savingWorkspace.value = false
  }
}

async function handleWorkspaceCommand(command, workspace) {
  if (command === 'members') return openMembers(workspace)
  if (command === 'edit') return openEditWorkspace(workspace)
  if (command === 'delete') return deleteWorkspace(workspace)
}

async function deleteWorkspace(workspace) {
  try {
    await ElMessageBox.confirm(
      `删除工作空间“${workspace.name}”会同时删除该空间下的全部周报周期、周报和成员关系，且不可恢复。确定删除吗？`,
      '删除工作空间',
      { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }
  await workspaceApi.remove(workspace.id)
  ElMessage.success('工作空间已删除')
  if (workspace.id === auth.workspace?.id) {
    ElMessage.warning('当前工作空间已删除，请重新登录选择工作空间')
    auth.logout()
    router.replace('/login')
    return
  }
  await loadWorkspaces()
}

async function openMembers(workspace) {
  activeWorkspace.value = workspace
  memberDrawerVisible.value = true
  memberLoading.value = true
  try {
    members.value = await workspaceApi.members(workspace.id)
  } finally {
    memberLoading.value = false
  }
}

async function refreshMembers() {
  if (!activeWorkspace.value) return
  members.value = await workspaceApi.members(activeWorkspace.value.id)
  await loadWorkspaces()
}

async function changeMemberRole(member, role) {
  const label = role === 'ADMIN' ? '管理员' : '员工'
  try {
    await ElMessageBox.confirm(
      `确定将 ${member.realName} 在本空间设置为${label}吗？${role === 'ADMIN' ? '管理员可管理周期、审阅周报和导出。' : '员工可填写本空间周报。'}`,
      '调整空间角色',
      { confirmButtonText: '确认调整', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }
  await workspaceApi.updateMemberRole(activeWorkspace.value.id, member.userId, role)
  ElMessage.success('角色已更新')
  await refreshMembers()
}

async function removeMember(member) {
  try {
    await ElMessageBox.confirm(
      `确定将 ${member.realName} 移出“${activeWorkspace.value.name}”吗？其历史周报会保留。`,
      '移除成员',
      { confirmButtonText: '确认移除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch (e) {
    return
  }
  await workspaceApi.removeMember(activeWorkspace.value.id, member.userId)
  ElMessage.success('成员已移除')
  await refreshMembers()
}

async function openAddMember() {
  memberMode.value = 'existing'
  existingForm.userId = null
  existingForm.role = 'EMPLOYEE'
  Object.assign(newMemberForm, { realName: '', username: '', password: '', sortNo: null, role: 'EMPLOYEE' })
  availableUsers.value = await workspaceApi.availableUsers(activeWorkspace.value.id)
  memberDialogVisible.value = true
}

async function submitMember() {
  if (!activeWorkspace.value) return
  addingMember.value = true
  try {
    if (memberMode.value === 'existing') {
      try {
        await existingFormRef.value.validate()
      } catch (e) {
        return
      }
      await workspaceApi.addMember(activeWorkspace.value.id, { ...existingForm })
      ElMessage.success('成员已添加')
    } else {
      try {
        await newMemberFormRef.value.validate()
      } catch (e) {
        return
      }
      await workspaceApi.createMember(activeWorkspace.value.id, { ...newMemberForm })
      ElMessage.success('员工账号已创建并加入工作空间')
    }
    memberDialogVisible.value = false
    await refreshMembers()
  } finally {
    addingMember.value = false
  }
}
</script>

<style scoped>
.workspace-summary {
  display: grid;
  grid-template-columns: repeat(3, 180px) minmax(280px, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 17px;
  border: 1px solid rgba(210, 225, 221, 0.85);
  border-radius: 15px;
  background: #fff;
  box-shadow: var(--shadow-sm);
}

.summary-icon {
  display: flex;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 17px;
}

.summary-icon.teal {
  background: #e5f6f2;
  color: #0f8b7d;
}

.summary-icon.green {
  background: #eaf5ed;
  color: #3d8d63;
}

.summary-icon.amber {
  background: #fcf3e4;
  color: #bd861f;
}

.summary-card div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summary-card strong {
  font-size: 21px;
  line-height: 1;
}

.summary-card span {
  color: var(--muted);
  font-size: 8px;
}

.summary-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 15px 18px;
  border: 1px solid #eee3cf;
  border-radius: 15px;
  background: #fffcf5;
  color: #9b7c42;
  font-size: 9px;
  line-height: 1.6;
}

.summary-note svg {
  width: 15px;
  flex-shrink: 0;
  color: #c59b54;
}

.loading-card {
  padding: 24px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.workspace-card {
  padding: 20px;
  border: 1px solid rgba(210, 225, 221, 0.9);
  border-radius: 18px;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.workspace-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.workspace-card-head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.workspace-logo {
  display: flex;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--brand-50), #dff4ef);
  color: var(--brand-600);
  font-size: 19px;
}

.workspace-title {
  min-width: 0;
  flex: 1;
}

.workspace-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.workspace-name-row h2 {
  margin: 0;
  overflow: hidden;
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-tag {
  padding: 3px 6px;
  border-radius: 5px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 7px;
  font-weight: 700;
}

.workspace-title p {
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.6;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-btn {
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #9aada9;
  cursor: pointer;
}

.more-btn:hover {
  background: #f2f7f5;
  color: var(--ink-soft);
}

.more-btn svg {
  width: 14px;
}

.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 15px 0;
  margin: 17px 0 13px;
  border-top: 1px solid #edf3f1;
  border-bottom: 1px solid #edf3f1;
}

.workspace-metrics div {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 4px;
}

.workspace-metrics strong {
  font-size: 17px;
  line-height: 1;
}

.workspace-metrics span {
  color: var(--muted);
  font-size: 8px;
}

.workspace-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.workspace-foot > span {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #9aada9;
  font-size: 8px;
}

.workspace-foot svg {
  width: 11px;
}

.workspace-foot :deep(.el-button) {
  font-size: 9px;
}

.workspace-foot :deep(.el-button svg) {
  width: 11px;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 11px;
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

.drawer-title > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.drawer-title strong {
  color: var(--ink);
  font-size: 16px;
}

.drawer-title span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 400;
}

.member-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.member-toolbar h3 {
  margin: 0 0 5px;
  font-size: 15px;
}

.member-toolbar p {
  margin: 0;
  color: var(--muted);
  font-size: 9px;
}

.member-toolbar :deep(svg) {
  width: 12px;
  margin-right: 4px;
}

.role-select {
  width: 104px;
}

.role-select :deep(.el-select__wrapper) {
  min-height: 28px;
  padding: 1px 8px;
  border-radius: 7px;
  background: #fbfdfc;
  box-shadow: 0 0 0 1px #e5eeeb inset;
  font-size: 9px;
}

.member-time {
  color: var(--muted);
  font-size: 9px;
}

.member-table :deep(.el-button) {
  font-size: 9px;
}

.member-table :deep(.el-button svg) {
  width: 11px;
}

.member-foot {
  padding: 13px 2px 0;
  color: #9aada9;
  font-size: 8px;
}

.compact-empty {
  padding: 28px 10px;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  margin-bottom: 18px;
  border: 1px solid #e8f0ee;
  border-radius: 9px;
  background: #f7faf9;
}

.mode-tabs button {
  flex: 1;
  padding: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
}

.mode-tabs button.active {
  background: #fff;
  color: var(--brand-700);
  box-shadow: 0 3px 8px rgba(15, 52, 47, 0.07);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 1150px) {
  .workspace-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workspace-summary {
    grid-template-columns: repeat(3, 1fr);
  }

  .summary-note {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .workspace-summary {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .member-toolbar {
    flex-direction: column;
  }

  .member-toolbar .el-button {
    width: 100%;
  }
}
</style>
