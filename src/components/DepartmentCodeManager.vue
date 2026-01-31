<template>
  <el-dialog
    v-model="visible"
    title="科室代码管理"
    width="600px"
    @close="handleClose"
  >
    <div class="dept-code-manager">
      <div class="info-section mb-4">
        <el-alert
          title="科室代码管理"
          description="您可以修改科室对应的代码。科室代码必须是单个英文字母，且不能重复。"
          type="info"
          :closable="false"
        />
      </div>

      <el-table :data="departmentList" border style="width: 100%" max-height="300">
        <el-table-column prop="name" label="科室名称" width="200">
          <template #default="scope">
            <span>{{ scope.row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="code" label="科室代码" width="150">
          <template #default="scope">
            <el-input
              v-model="scope.row.code"
              maxlength="1"
              style="width: 80px"
              @blur="validateCode(scope.row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button
              type="danger"
              size="small"
              @click="deleteDepartment(scope.$index)"
              :disabled="departmentList.length <= 2"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="action-buttons mt-4">
        <el-button @click="addDepartment">添加科室</el-button>
        <el-button @click="regenerateCodes">重新生成所有代码</el-button>
        <div style="flex: 1"></div>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

interface Department {
  name: string;
  code: string;
}

const props = defineProps<{
  modelValue: boolean;
  departments?: Department[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [departments: Department[]];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const departmentList = ref<Department[]>([]);

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadData();
  }
});

watch(() => props.departments, () => {
  if (props.modelValue) {
    loadData();
  }
}, { deep: true });

const loadData = () => {
  if (props.departments && props.departments.length > 0) {
    departmentList.value = props.departments.map(d => ({ ...d }));
  } else {
    // 默认科室列表
    departmentList.value = [
      { name: '一室', code: 'A' },
      { name: '二室', code: 'B' },
      { name: '三室', code: 'C' },
      { name: '四室', code: 'D' },
      { name: '五室', code: 'E' },
      { name: '六室', code: 'F' },
      { name: '七室', code: 'G' }
    ];
  }
};

const validateCode = (dept: Department) => {
  const code = dept.code.trim().toUpperCase();
  
  if (!code) {
    ElMessage.warning(`科室 "${dept.name}" 的代码不能为空`);
    dept.code = '';
    return false;
  }
  
  if (code.length !== 1 || !/[A-Z]/.test(code)) {
    ElMessage.warning(`科室代码必须是单个英文字母，当前: "${code}"`);
    dept.code = '';
    return false;
  }
  
  // 检查重复
  const duplicate = departmentList.value.filter(d => d.code === code && d.name !== dept.name);
  if (duplicate.length > 0) {
    ElMessage.warning(`代码 "${code}" 已被使用`);
    dept.code = '';
    return false;
  }
  
  dept.code = code;
  return true;
};

const addDepartment = async () => {
  if (departmentList.value.length >= 26) {
    ElMessage.warning('科室数量已达到上限（26个），无法继续添加（科室代码要求为单个英文字母）');
    return;
  }

  try {
    const { value } = await ElMessageBox.prompt('请输入新科室名称', '添加科室', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '科室名称不能为空'
    });
    
    if (value && value.trim()) {
      const deptName = value.trim();
      
      // 检查是否已存在
      if (departmentList.value.some(d => d.name === deptName)) {
        ElMessage.warning(`科室 "${deptName}" 已存在`);
        return;
      }
      
      // 生成新代码
      const usedCodes = new Set(departmentList.value.map(d => d.code));
      let newCode = 'A';
      for (let i = 0; i < 26; i++) {
        const code = String.fromCharCode(65 + i);
        if (!usedCodes.has(code)) {
          newCode = code;
          break;
        }
      }
      
      departmentList.value.push({ name: deptName, code: newCode });
      ElMessage.success(`已添加科室 "${deptName}"，代码为 "${newCode}"`);
    }
  } catch {
    // 用户取消
  }
};

const deleteDepartment = async (index: number) => {
  if (departmentList.value.length <= 2) {
    ElMessage.warning('至少需要保留2个科室');
    return;
  }
  
  const dept = departmentList.value[index];
  try {
    await ElMessageBox.confirm(
      `确定要删除科室 "${dept.name}" (代码: ${dept.code}) 吗？\n\n注意：删除后该科室的所有相关数据将无法恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    departmentList.value.splice(index, 1);
    ElMessage.success('科室已删除');
  } catch {
    // 用户取消
  }
};

const regenerateCodes = async () => {
  if (departmentList.value.length > 26) {
    ElMessage.warning('科室数量超过 26 个，无法重新生成单字母代码。请先删除部分科室。');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '确定要重新生成所有科室代码吗？这将覆盖当前的代码设置。',
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 重新生成代码
    const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    for (let i = alphabet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [alphabet[i], alphabet[j]] = [alphabet[j], alphabet[i]];
    }

    departmentList.value.forEach((dept, index) => {
      dept.code = alphabet[index];
    });
    
    ElMessage.success('科室代码已重新生成');
  } catch {
    // 用户取消
  }
};

const saveConfig = () => {
  // 验证所有代码
  for (const dept of departmentList.value) {
    if (!validateCode(dept)) {
      return;
    }
  }
  
  emit('save', departmentList.value);
  ElMessage.success('配置已保存');
  handleClose();
};

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.dept-code-manager {
  padding: 10px 0;
}

.info-section {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>

