<template>
  <el-dialog
    v-model="visible"
    title="科室互通设置"
    width="700px"
    @close="handleClose"
  >
    <div class="interconnect-settings">
      <div class="info-section mb-4">
        <el-alert
          title="科室互通设置"
          description="设置互通的科室将被视为一个整体。例如：三室和七室互通后，三室考生不能分配三室或七室的考官。"
          type="info"
          :closable="false"
        />
      </div>

      <div class="current-groups mb-4">
        <h3 class="text-lg font-semibold mb-2">当前互通组：</h3>
        <el-table :data="interconnectGroups" border style="width: 100%" max-height="200">
          <el-table-column prop="display" label="互通科室" />
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button
                type="danger"
                size="small"
                @click="deleteGroup(scope.$index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-card class="add-group-card">
        <template #header>
          <span>添加新互通组</span>
        </template>
        <div class="add-group-content">
          <p class="mb-3 text-sm text-gray-600">选择2个或3个科室设置为互通：</p>
          <div class="checkbox-group">
            <el-checkbox
              v-for="dept in availableDepartments"
              :key="dept.code"
              v-model="selectedDepts"
              :label="dept.code"
            >
              {{ dept.name }} ({{ dept.code }})
            </el-checkbox>
          </div>
          <el-button
            type="success"
            class="mt-3"
            @click="addInterconnectGroup"
            :disabled="selectedDepts.length < 2 || selectedDepts.length > 3"
          >
            添加互通组
          </el-button>
        </div>
      </el-card>

      <div class="action-buttons mt-4">
        <el-button type="danger" @click="clearAllGroups">清空所有</el-button>
        <div style="flex: 1"></div>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="saveConfig">确定</el-button>
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

interface InterconnectGroup {
  codes: string[];
  names: string[];
  display: string;
}

const props = defineProps<{
  modelValue: boolean;
  departments?: Department[];
  groups?: InterconnectGroup[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'save': [groups: InterconnectGroup[]];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const availableDepartments = computed(() => props.departments || []);
const interconnectGroups = ref<InterconnectGroup[]>([]);
const selectedDepts = ref<string[]>([]);

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadData();
  }
});

watch(() => props.groups, () => {
  if (props.modelValue) {
    loadData();
  }
}, { deep: true });

const loadData = () => {
  if (props.groups && props.groups.length > 0) {
    interconnectGroups.value = props.groups.map(g => ({ ...g }));
  } else {
    interconnectGroups.value = [];
  }
  selectedDepts.value = [];
};

const addInterconnectGroup = () => {
  if (selectedDepts.value.length < 2 || selectedDepts.value.length > 3) {
    ElMessage.warning('请选择2个或3个科室');
    return;
  }
  
  // 检查是否已存在相同的组
  const sortedCodes = [...selectedDepts.value].sort().join(',');
  const exists = interconnectGroups.value.some(g => {
    const groupCodes = [...g.codes].sort().join(',');
    return groupCodes === sortedCodes;
  });
  
  if (exists) {
    ElMessage.warning('该互通组已存在');
    return;
  }
  
  const names = selectedDepts.value.map(code => {
    const dept = availableDepartments.value.find(d => d.code === code);
    return dept ? dept.name : code;
  });
  
  interconnectGroups.value.push({
    codes: [...selectedDepts.value],
    names,
    display: names.join(' + ')
  });
  
  selectedDepts.value = [];
  ElMessage.success('互通组已添加');
};

const deleteGroup = async (index: number) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除互通组 "${interconnectGroups.value[index].display}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    interconnectGroups.value.splice(index, 1);
    ElMessage.success('互通组已删除');
  } catch {
    // 用户取消
  }
};

const clearAllGroups = async () => {
  if (interconnectGroups.value.length === 0) {
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      '确定要清空所有互通组吗？',
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    interconnectGroups.value = [];
    ElMessage.success('已清空所有互通组');
  } catch {
    // 用户取消
  }
};

const saveConfig = () => {
  emit('save', interconnectGroups.value);
  ElMessage.success('配置已保存');
  handleClose();
};

const handleClose = () => {
  visible.value = false;
};
</script>

<style scoped>
.interconnect-settings {
  padding: 10px 0;
}

.info-section {
  margin-bottom: 20px;
}

.current-groups {
  margin-bottom: 20px;
}

.add-group-card {
  margin-bottom: 20px;
}

.add-group-content {
  padding: 10px 0;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}
</style>

