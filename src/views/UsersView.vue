<template>
  <div class="page-shell">
    <div class="page-heading">
      <div>
        <span class="eyebrow">TEAM MANAGEMENT</span>
        <h1>用户管理</h1>
        <p>添加普通员工，并将员工设置为管理员。超级管理员账号受保护。</p>
      </div>
      <div class="heading-actions">
        <el-button type="primary" @click="openCreate"><Plus /> 新增员工</el-button>
      </div>
    </div>

    <div class="user-stats">
      <div class="user-stat">
        <div class="stat-icon teal"><UserFilled /></div>
        <div><strong>{{ users.length }}</strong><span>全部账号</span></div>
      </div>
      <div class="user-stat">
        <div class="stat-icon green"><Avatar /></div>
        <div><strong>{{ countByRole('EMPLOYEE') }}</strong><span>普通账号</span></div>
      </div>
      <div class="user-stat">
        <div class="stat-icon amber"><Management /></div>
        <div><strong>{{ countByRole('SUPER_ADMIN') }}</strong><span>超级管理员</span></div>
      </div>
      <div class="user-stat">
        <div class="stat-icon slate"><Lock /></div>
        <div><strong>{{ countDisabled }}</strong><span>已停用</span></div>
      </div>
    </div>

    <section class="app-card table-card">
      <div class="table-head">
        <div>
          <h2>全局账号</h2>
          <p>账号可加入多个工作空间，工作空间内的员工/管理员角色请在工作空间管理中设置。</p>
        </div>
        <div class="table-tools">
          <el-input v-model="keyword" placeholder="搜索姓名或账号" clearable class="search-input">
            <template #prefix><Search /></template>
          </el-input>
          <el-select v-model="roleFilter" class="role-filter">
            <el-option label="全部角色" value="ALL" />
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="普通账号" value="EMPLOYEE" />
          </el-select>
          <el-button text :loading="loading" @click="loadUsers"><Refresh /> 刷新</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="filteredUsers" row-key="id" class="user-table">
        <el-table-column label="成员" min-width="220">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar-chip" :class="{ super: row.role === 'SUPER_ADMIN' }">{{ initialOf(row.realName) }}</div>
              <div>
                <div class="user-name">
                  {{ row.realName }}
                  <span v-if="row.role === 'SUPER_ADMIN'" class="super-flag"><StarFilled /> 系统</span>
                </div>
                <div class="user-account">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="178">
          <template #default="{ row }">
            <div v-if="row.role === 'SUPER_ADMIN'" class="super-role">
              <StarFilled />
              <span>超级管理员</span>
            </div>
            <span v-else class="normal-role">普通账号</span>
          </template>
        </el-table-column>
        <el-table-column label="账号状态" width="122">
          <template #default="{ row }">
            <div v-if="row.role === 'SUPER_ADMIN'" class="status-text">
              <span class="status-dot"></span>正常
            </div>
            <el-switch
              v-else
              :model-value="row.status === 1"
              size="small"
              inline-prompt
              active-text="启"
              inactive-text="停"
              @change="(value) => toggleStatus(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="排序" width="80" align="center">
          <template #default="{ row }">
            <span class="sort-no">{{ row.sortNo }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="148">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="132" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.role !== 'SUPER_ADMIN'" text type="primary" @click="openReset(row)">
              <Key /> 重置密码
            </el-button>
            <span v-else class="protected-text"><Lock /> 受保护</span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon"><UserFilled /></div>
            <strong>没有匹配的成员</strong>
            <span>调整搜索条件，或点击右上角新增员工。</span>
          </div>
        </template>
      </el-table>
      <div class="table-foot">
        <span>共 {{ filteredUsers.length }} 位成员</span>
        <span>普通账号 {{ countByRole('EMPLOYEE') }} 个 · 超级管理员 {{ countByRole('SUPER_ADMIN') }} 个</span>
      </div>
    </section>

    <section class="permission-note">
      <div class="permission-icon"><InfoFilled /></div>
      <div class="permission-copy">
        <strong>工作空间与角色说明</strong>
        <p>
          一个账号可以加入多个工作空间，并在不同工作空间中拥有不同角色。员工/管理员角色请前往“工作空间管理”设置；
          超级管理员账号拥有全局工作空间和账号管理权限。
        </p>
      </div>
    </section>

    <el-dialog v-model="createVisible" title="新增员工" width="500px" append-to-body destroy-on-close>
      <div class="dialog-note">
        <UserFilled />
        <span>新账号默认角色为“员工”，创建后可在列表中将其设置为管理员。</span>
      </div>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <div class="form-row">
          <el-form-item label="员工姓名" prop="realName">
            <el-input v-model="createForm.realName" placeholder="请输入员工姓名" />
          </el-form-item>
          <el-form-item label="登录账号" prop="username">
            <el-input v-model="createForm.username" placeholder="字母、数字或下划线" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="初始密码" prop="password">
            <el-input v-model="createForm.password" type="password" show-password placeholder="至少 6 位" />
          </el-form-item>
          <el-form-item label="排序（可选）" prop="sortNo">
            <el-input-number v-model="createForm.sortNo" :min="0" :max="9999" controls-position="right" placeholder="自动排序" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-hint">排序用于导出 Excel 时的员工顺序，数值越小越靠前。</div>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createUser">创建员工</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetVisible" title="重置登录密码" width="440px" append-to-body destroy-on-close>
      <div class="reset-user">
        <div class="avatar-chip">{{ initialOf(resetUser?.realName) }}</div>
        <div><strong>{{ resetUser?.realName }}</strong><span>@{{ resetUser?.username }}</span></div>
      </div>
      <el-form ref="resetFormRef" :model="resetForm" :rules="resetRules" label-position="top">
        <el-form-item label="新密码" prop="password">
          <el-input v-model="resetForm.password" type="password" show-password placeholder="请输入 6-32 位新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" :loading="resetting" @click="resetPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Avatar,
  InfoFilled,
  Key,
  Lock,
  Management,
  Plus,
  Refresh,
  Search,
  StarFilled,
  UserFilled
} from '@element-plus/icons-vue'
import { userApi, workspaceApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { formatDateTime, initialOf } from '../utils/format'

const auth = useAuthStore()
const users = ref([])
const loading = ref(false)
const keyword = ref('')
const roleFilter = ref('ALL')
const createVisible = ref(false)
const creating = ref(false)
const resetVisible = ref(false)
const resetting = ref(false)
const resetUser = ref(null)
const createFormRef = ref()
const resetFormRef = ref()

const createForm = reactive({
  realName: '',
  username: '',
  password: '',
  sortNo: null
})

const resetForm = reactive({ password: '' })

const createRules = {
  realName: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }],
  username: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{3,32}$/, message: '账号需为 3-32 位字母、数字或下划线', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度需为 6-32 位', trigger: 'blur' }
  ]
}

const resetRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度需为 6-32 位', trigger: 'blur' }
  ]
}

const countDisabled = computed(() => users.value.filter((item) => item.status === 0 && item.role !== 'SUPER_ADMIN').length)

const filteredUsers = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return users.value.filter((item) => {
    const matchesRole = roleFilter.value === 'ALL' || item.role === roleFilter.value
    const matchesKeyword = !kw || item.realName?.toLowerCase().includes(kw) || item.username?.toLowerCase().includes(kw)
    return matchesRole && matchesKeyword
  })
})

onMounted(loadUsers)

async function loadUsers() {
  loading.value = true
  try {
    users.value = await userApi.list()
  } finally {
    loading.value = false
  }
}

function countByRole(role) {
  return users.value.filter((item) => item.role === role).length
}

function openCreate() {
  Object.assign(createForm, { realName: '', username: '', password: '', sortNo: null })
  createVisible.value = true
}

async function createUser() {
  try {
    await createFormRef.value.validate()
  } catch (e) {
    return
  }
  creating.value = true
  try {
    await workspaceApi.createMember(auth.workspace.id, {
      realName: createForm.realName.trim(),
      username: createForm.username.trim(),
      password: createForm.password,
      sortNo: createForm.sortNo,
      role: 'EMPLOYEE'
    })
    ElMessage.success('员工账号已创建并加入当前工作空间')
    createVisible.value = false
    await loadUsers()
  } finally {
    creating.value = false
  }
}

async function toggleStatus(row, enabled) {
  const action = enabled ? '启用' : '停用'
  try {
    await ElMessageBox.confirm(
      `确定${action} ${row.realName} 的账号吗？${enabled ? '' : '停用后该账号将无法登录。'}`,
      `${action}账号`,
      { confirmButtonText: `确认${action}`, cancelButtonText: '取消', type: enabled ? 'info' : 'warning' }
    )
  } catch (e) {
    return
  }
  await userApi.updateStatus(row.id, enabled ? 1 : 0)
  ElMessage.success(`账号已${action}`)
  await loadUsers()
}

function openReset(row) {
  resetUser.value = row
  resetForm.password = ''
  resetVisible.value = true
}

async function resetPassword() {
  try {
    await resetFormRef.value.validate()
  } catch (e) {
    return
  }
  resetting.value = true
  try {
    await userApi.resetPassword(resetUser.value.id, resetForm.password)
    ElMessage.success('密码已重置')
    resetVisible.value = false
  } finally {
    resetting.value = false
  }
}
</script>

<style scoped>
.user-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.user-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(210, 225, 221, 0.85);
  border-radius: 15px;
  background: #fff;
  box-shadow: var(--shadow-sm);
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
  background: #eaf5ed;
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

.user-stat > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-stat strong {
  font-size: 22px;
  line-height: 1;
}

.user-stat span {
  color: var(--muted);
  font-size: 8px;
}

.table-card {
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

.table-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  width: 200px;
}

.search-input :deep(.el-input__wrapper),
.role-filter :deep(.el-select__wrapper) {
  min-height: 34px;
  border: 1px solid var(--line);
  background: #fbfdfc;
  box-shadow: none;
}

.role-filter {
  width: 130px;
}

.table-tools :deep(svg) {
  width: 12px;
}

.user-table :deep(.el-button) {
  font-size: 9px;
}

.user-table :deep(.el-button svg) {
  width: 11px;
}

.super {
  background: linear-gradient(135deg, #f7e7c7, #eed4a2);
  color: #8c6118;
}

.super-flag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px;
  margin-left: 3px;
  border-radius: 4px;
  background: #fbf1df;
  color: #b08330;
  font-size: 7px;
  font-weight: 700;
  vertical-align: middle;
}

.super-flag svg {
  width: 8px;
}

.super-role {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a3792f;
  font-size: 9px;
  font-weight: 700;
}

.super-role svg {
  width: 13px;
}

.normal-role {
  color: var(--muted);
  font-size: 9px;
}

.role-select {
  width: 106px;
}

.role-select :deep(.el-select__wrapper) {
  min-height: 28px;
  padding: 1px 8px;
  border-radius: 7px;
  background: #fbfdfc;
  box-shadow: 0 0 0 1px #e5eeeb inset;
  font-size: 9px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
}

.role-option i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.role-option i.employee {
  background: #9aada9;
}

.role-option i.admin {
  background: var(--brand-500);
}

.status-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--success);
  font-size: 9px;
  font-weight: 600;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--success);
}

.sort-no {
  display: inline-flex;
  min-width: 24px;
  justify-content: center;
  padding: 3px 7px;
  border-radius: 5px;
  background: #f2f6f5;
  color: var(--muted);
  font-size: 8px;
  font-variant-numeric: tabular-nums;
}

.time-text {
  color: var(--muted);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.protected-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #aab9b6;
  font-size: 8px;
}

.protected-text svg {
  width: 10px;
}

.table-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 4px 0;
  color: #9aada9;
  font-size: 8px;
}

.permission-note {
  display: flex;
  gap: 12px;
  padding: 18px 20px;
  margin-top: 16px;
  border: 1px solid #e8eee7;
  border-radius: 14px;
  background: #fbfdfb;
}

.permission-icon {
  display: flex;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--brand-50);
  color: var(--brand-600);
  font-size: 14px;
}

.permission-copy strong {
  font-size: 10px;
  color: var(--ink-soft);
}

.permission-copy p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.8;
}

.dialog-note {
  display: flex;
  gap: 8px;
  padding: 11px 13px;
  margin-bottom: 18px;
  border: 1px solid #e8eee7;
  border-radius: 9px;
  background: #f8fbfa;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.6;
}

.dialog-note svg {
  width: 13px;
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--brand-600);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.user-table + .table-foot {
  border-top: 0;
}

.reset-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 16px;
  border-radius: 9px;
  background: #f8fbfa;
}

.reset-user > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.reset-user strong {
  font-size: 11px;
}

.reset-user span {
  color: var(--muted);
  font-size: 9px;
}

@media (max-width: 1040px) {
  .user-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .table-head {
    flex-direction: column;
  }

  .table-tools {
    width: 100%;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1;
    min-width: 180px;
  }
}

@media (max-width: 660px) {
  .user-stats {
    grid-template-columns: 1fr;
  }

  .table-card {
    padding: 14px;
    overflow-x: auto;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .table-tools {
    align-items: stretch;
  }
}
</style>
