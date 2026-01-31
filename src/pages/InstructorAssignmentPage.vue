<template>
  <div class="app-container" id="instructor-assignment-page">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">
            <img src="/icon.png" alt="系统图标" class="logo-img" />
          </div>
          <div class="logo-text" v-show="!sidebarCollapsed">
            <h1 class="system-title">考试自动排班助手</h1>
            <p class="system-subtitle">Examiner Assignment Assistant</p>
          </div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-items">
          <router-link to="/" class="nav-item">
            <Home class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">首页</span>
          </router-link>
          <router-link to="/teachers" class="nav-item">
            <Users class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">考官管理</span>
          </router-link>
          <router-link to="/instructor-assignment" class="nav-item nav-item-active">
            <Shuffle class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">考官分配</span>
          </router-link>
          <router-link to="/schedules" class="nav-item">
            <Calendar class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">自动排班</span>
          </router-link>
        </div>
      </nav>

      <!-- 版本号显示 -->
      <div class="sidebar-footer" v-show="!sidebarCollapsed">
        <div class="version-info">
          <span class="version-label">版本</span>
          <span class="version-number">v{{ appVersion }}</span>
        </div>
      </div>

      <!-- 侧边栏收缩按钮 -->
      <div class="sidebar-toggle" @click="toggleSidebar">
        <ChevronLeft class="toggle-icon" :class="{ rotated: sidebarCollapsed }" />
      </div>
    </aside>

    <!-- 主内容区域 -->
    <div class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
  <div class="dashboard-page">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">考官分配</h1>
          </div>
      <div class="header-actions">
              <el-button size="small" type="danger" plain @click="clearAllStudents" :disabled="students.length === 0">
                <template #icon><Trash2 class="w-4 h-4" /></template>
                清空考生
              </el-button>
              <el-button size="small" @click="showImportDialog = true">
                <template #icon><Upload class="w-4 h-4" /></template>
                导入考生信息
              </el-button>
              <el-button size="small" @click="exportResults" :disabled="students.length === 0">
                <template #icon><Download class="w-4 h-4" /></template>
                导出结果
              </el-button>
              <el-button 
                type="primary" 
                size="small" 
                @click="exportToSchedulePage" 
                :disabled="students.length === 0"
              >
                <template #icon><Calendar class="w-4 h-4" /></template>
                导出到自动排班
              </el-button>
              <el-button size="small" @click="addStudent" type="primary">
                <template #icon><UserPlus class="w-4 h-4" /></template>
                添加考生
              </el-button>
              <el-dropdown @command="handleSettingsCommand">
                <el-button type="primary" plain>
                  <template #icon><Settings class="w-4 h-4" /></template>
                  设置
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item divided command="template">示例文档</el-dropdown-item>
                    <el-dropdown-item command="dept-code">科室代码管理</el-dropdown-item>
                    <el-dropdown-item command="interconnect">科室互通设置</el-dropdown-item>
                    <el-dropdown-item command="exam-config">考题配置</el-dropdown-item>
                    <el-dropdown-item divided command="backup">数据备份与恢复</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
      </div>
    </div>

        <!-- 考生选择区域 -->
        <div class="bg-white rounded-lg shadow-sm p-6 mb-3">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">考生选择</h2>
            <span class="text-sm text-gray-500">共 {{ students.length }} 位考生</span>
        </div>
        
          <!-- 考生列表 -->
          <div v-if="students.length > 0" class="student-list-container">
            <div 
              v-for="student in students" 
              :key="student.name"
              class="student-item"
              :class="{
                'student-item-selected': selectedStudent === student.name,
                'student-item-completed': isStudentCompleted(student),
                'student-item-partial': isStudentPartial(student),
                'student-item-pending': isStudentPending(student)
              }"
              @click="selectStudent(student.name)"
            >
              <div class="student-name-simple">
                <span class="name-text">{{ student.name }}</span>
                <div class="student-status-dot" :class="getStudentStatusDotClass(student)" :title="getStudentBadgeText(student)"></div>
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-else class="empty-state">
            <p class="text-gray-400 text-center py-8">暂无考生数据，请先导入考生信息</p>
          </div>
        </div>

        <!-- 转盘和考生信息区域 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <!-- 转盘区域 -->
          <div class="lg:col-span-2 bg-white rounded-lg shadow-sm p-6 flex flex-col">
            <div class="mb-6">
              <h2 class="text-lg font-semibold text-gray-900">转盘抽签</h2>
            </div>
            
            <div ref="wheelAreaRef" class="flex flex-col items-center justify-start flex-1 min-h-[560px] pt-4">
              <!-- 转盘区域 -->
              <div class="flex flex-col items-center">
                <SpinWheel
                  ref="spinWheelRef"
                  :rooms="wheelDisplayRooms"
                  :room-labels="wheelDisplayLabels"
                  :size="wheelSize"
                  @finished="onWheelFinished"
                />
              </div>
              
              <!-- 考题数字罗盘 -->
              <div class="flex flex-col items-center mt-8">

              </div>
            </div>
          </div>

          <!-- 考生信息和操作区域 -->
          <div class="bg-white rounded-lg shadow-sm p-6 flex flex-col h-full">
            <div class="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 class="text-lg font-semibold text-gray-900">考生信息</h2>
              <el-tag v-if="currentStudent" type="success" size="small">已选择</el-tag>
              <el-tag v-else type="info" size="small">未选择</el-tag>
            </div>
            
            <!-- 考生信息显示 - 纵向排列 -->
            <div class="mb-4 flex-1 overflow-y-auto min-h-0">
              <div class="space-y-3">
                <div class="info-field info-field-vertical" :class="{ 'info-field-empty': !currentStudent }">
                  <div class="flex items-center justify-between w-full">
                    <div class="info-label info-label-name">姓名：</div>
                    <div class="info-value info-value-name text-right flex-1">{{ currentStudent?.name || '-' }}</div>
                  </div>
                </div>
                <div class="info-field info-field-vertical" :class="{ 'info-field-empty': !currentStudent }">
                  <div class="flex items-center justify-between w-full">
                    <div class="info-label info-label-dept">科室：</div>
                    <div class="info-value info-value-dept text-right flex-1">{{ displayDepartment(currentStudent?.department) }}</div>
                  </div>
                </div>
                <div class="info-field info-field-vertical" :class="{ 
                  'info-field-filled': currentStudent?.examiner1,
                  'info-field-empty': !currentStudent?.examiner1 
                }">
                  <div class="flex items-center justify-between w-full">
                    <div class="info-label info-label-examiner1">考官一：</div>
                    <div class="info-value info-value-examiner1 text-right flex-1">{{ currentStudent?.examiner1 || '-' }}</div>
                  </div>
                </div>
                <div class="info-field info-field-vertical" :class="{ 
                  'info-field-filled': currentStudent?.examiner2,
                  'info-field-empty': !currentStudent?.examiner2 
                }">
                  <div class="flex items-center justify-between w-full">
                    <div class="info-label info-label-examiner2">考官二：</div>
                    <div class="info-value info-value-examiner2 text-right flex-1">{{ currentStudent?.examiner2 || '-' }}</div>
                  </div>
                </div>
                <div class="info-field info-field-vertical" :class="{ 
                  'info-field-filled': currentStudent?.examQuestion,
                  'info-field-empty': !currentStudent?.examQuestion 
                }">
                  <div class="flex items-center justify-between w-full">
                    <div class="info-label info-label-exam">考题：</div>
                    <!-- 跑马灯效果 -->
                    <div class="info-value info-value-exam text-right flex-1 relative overflow-hidden" style="min-height: 24px;">
                      <div v-if="isExamQuestionSpinning" class="exam-question-marquee">
                        <!-- 中间指示线 -->
                        <div class="exam-question-indicator">
                          <div class="indicator-line"></div>
                        </div>
                        <div 
                          class="exam-question-item"
                          :style="{ transform: `translateY(${examQuestionMarqueeOffset}px)` }"
                        >
                          <div 
                            v-for="(option, index) in examQuestionMarqueeOptions" 
                            :key="`marquee-${index}`"
                            class="exam-question-option"
                            :class="{ 'active': index === examQuestionMarqueeCurrentIndex }"
                          >
                            考题{{ option }}
                          </div>
                        </div>
                      </div>
                      <div v-else class="exam-question-result">
                        {{ currentStudent?.examQuestion ? `考题${currentStudent.examQuestion}` : '-' }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 🆕 智能推荐提示（已隐藏，但后台逻辑仍在运行，转盘分配时会参考推荐科室） -->
            <!-- <div v-if="smartRecommendation && currentStudent" class="smart-recommendation-card mt-4">
              <div class="recommendation-header">
                <span class="recommendation-icon">🎯</span>
                <span class="recommendation-title">智能推荐</span>
                <span class="recommendation-confidence" :class="getConfidenceClass(smartRecommendation.confidence)">
                  置信度: {{ smartRecommendation.confidence }}%
                </span>
              </div>
              <div class="recommendation-content">
                <div class="recommendation-item">
                  <span class="item-label">考官一推荐:</span>
                  <span class="item-value dept-tag" :class="getRecommendationClass(smartRecommendation.examiner1Dept)">
                    {{ smartRecommendation.examiner1Dept }}室
                  </span>
                  <span class="item-hint">(学员同科室)</span>
                </div>
                <div class="recommendation-item">
                  <span class="item-label">考官二推荐:</span>
                  <span class="item-value dept-tag" :class="getRecommendationClass(smartRecommendation.examiner2Dept)">
                    {{ smartRecommendation.examiner2Dept }}室
                  </span>
                  <span class="item-hint">(高可用科室)</span>
                </div>
              </div>
              <div v-if="smartRecommendation.warnings.length > 0" class="recommendation-warnings">
                <div v-for="(warning, idx) in smartRecommendation.warnings" :key="idx" class="warning-item">
                  ⚠️ {{ warning }}
                </div>
              </div>
            </div> -->

            <!-- 操作按钮 - 纵向排列 -->
            <div class="flex flex-col gap-6 flex-shrink-0 mt-6">
              <el-button 
                type="primary" 
                size="large"
                class="action-btn-vertical action-btn-gradient action-btn-primary-gradient"
                @click="startSpin(1)" 
                :loading="loading || isSpinning"
                :disabled="!form.studentDept || form.availableRooms.length === 0 || !currentStudent"
                :title="!currentStudent ? '请先选择考生' : (!form.studentDept ? '请设置考生科室代码' : '')"
              >
                <template #icon><User class="w-4 h-4" /></template>
                考官一
              </el-button>
              <el-button 
                type="success" 
                size="large"
                class="action-btn-vertical action-btn-gradient action-btn-success-gradient"
                @click="startSpin(2)" 
                :loading="loading || isSpinning" 
                :disabled="!result1 || !form.studentDept || !currentStudent"
                :title="!currentStudent ? '请先选择考生' : (!result1 ? '请先分配第一考官' : '')"
              >
                <template #icon><Users class="w-4 h-4" /></template>
                考官二
              </el-button>
              <el-button 
                type="warning" 
                size="large"
                class="action-btn-vertical action-btn-gradient action-btn-warning-gradient"
                @click="assignExamQuestion"
                :loading="loading"
                :disabled="!result1 || !currentStudent"
                :title="!currentStudent ? '请先选择考生' : (!result1 ? '请先分配第一考官' : '')"
              >
                <template #icon><FileText class="w-4 h-4" /></template>
                考题
              </el-button>
              
              <!-- 快速状态提示 -->
              <div v-if="currentStudent" class="text-xs text-gray-500 text-center mt-2">
                <span v-if="currentStudent.examiner1 && currentStudent.examiner2 && currentStudent.examQuestion" class="text-green-600">
                  ✓ 分配完成
                </span>
                <span v-else-if="currentStudent.examiner1 && currentStudent.examiner2" class="text-blue-600">
                  ⏳ 待分配考题
                </span>
                <span v-else-if="currentStudent.examiner1" class="text-yellow-600">
                  ⏳ 待分配考官二
                </span>
                <span v-else class="text-gray-400">
                  ⏳ 待开始分配
                </span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>

    <!-- 历史记录对话框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="历史记录"
      width="800px"
    >
      <div class="history-container">
        <div class="flex items-center justify-between mb-4">
          <el-input
            v-model="historySearchText"
            placeholder="搜索历史记录..."
            style="width: 300px"
            clearable
          >
            <template #prefix>
              <Search class="w-4 h-4" />
            </template>
          </el-input>
          <el-select v-model="historyFilterType" style="width: 150px" placeholder="筛选类型">
            <el-option label="全部" value="all" />
            <el-option label="抽签操作" value="assignment" />
            <el-option label="考题分配" value="exam" />
            <el-option label="数据导入" value="import" />
            <el-option label="数据导出" value="export" />
          </el-select>
        </div>
        <el-table :data="filteredHistory" style="width: 100%" max-height="400">
          <el-table-column prop="timestamp" label="时间" width="180" :formatter="formatHistoryTime" />
                <el-table-column prop="student" label="考生" width="120" />
          <el-table-column prop="action" label="操作" width="120" />
          <el-table-column prop="result" label="结果" />
          <el-table-column label="操作" width="100">
            <template #default="scope">
              <el-button size="small" @click="viewHistoryDetail(scope.row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 科室代码管理对话框 -->
    <DepartmentCodeManager
      v-model="showDeptCodeDialog"
      :departments="departmentList"
      @save="handleSaveDeptCodes"
    />

    <!-- 科室互通设置对话框 -->
    <InterconnectSettings
      v-model="showInterconnectDialog"
      :departments="departmentList"
      :groups="interconnectGroups"
      @save="handleSaveInterconnect"
    />

    <!-- 考题配置对话框 -->
    <ExamConfig
      v-model="showExamConfigDialog"
      :current-count="examQuestionCount"
      @save="handleSaveExamConfig"
    />

    <!-- 考生信息管理对话框 -->
    <el-dialog
      v-model="showStudentInfoDialog"
      title="考生信息管理"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div class="mb-4">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <el-input
              v-model="studentInfoSearchText"
              placeholder="搜索考生姓名..."
              style="width: 200px"
              clearable
            >
              <template #prefix>
                <Search class="w-4 h-4" />
              </template>
            </el-input>
            <el-select v-model="studentInfoFilterDept" style="width: 150px" placeholder="筛选科室" clearable>
              <el-option label="全部科室" value="" />
              <el-option
                v-for="dept in departmentList"
                :key="dept.name"
                :label="dept.name"
                :value="dept.name"
              />
            </el-select>
            <el-select v-model="studentInfoFilterStatus" style="width: 150px" placeholder="筛选状态" clearable>
              <el-option label="全部状态" value="" />
              <el-option label="已完成" value="completed" />
              <el-option label="进行中" value="partial" />
              <el-option label="待处理" value="pending" />
            </el-select>
          </div>
          <div class="flex items-center gap-2">
            <el-button size="small" @click="exportStudentInfo" :disabled="filteredStudentInfo.length === 0">
              <template #icon><Download class="w-4 h-4" /></template>
              导出数据
            </el-button>
          </div>
        </div>
      </div>

      <div class="student-info-table-container">
        <el-table
          :data="filteredStudentInfo"
          border
          stripe
          max-height="500"
          style="width: 100%"
        >
          <el-table-column prop="name" label="姓名" width="120" fixed="left" />
          <el-table-column prop="department" label="科室" width="120" />
          <el-table-column prop="group" label="班组" width="100">
            <template #default="scope">
              <span :class="{'text-success': scope.row.group}">
                {{ scope.row.group || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="examiner1" label="考官一" width="120">
            <template #default="scope">
              <span :class="{'text-success': scope.row.examiner1}">
                {{ scope.row.examiner1 || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="examiner2" label="考官二" width="120">
            <template #default="scope">
              <span :class="{'text-success': scope.row.examiner2}">
                {{ scope.row.examiner2 || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="examQuestion" label="考题" width="100">
            <template #default="scope">
              <span :class="{'text-success': scope.row.examQuestion}">
                {{ scope.row.examQuestion || '-' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStudentInfoStatusType(scope.row)" size="small">
                {{ getStudentInfoStatusText(scope.row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" text @click="viewStudentDetail(scope.row)">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="mt-4 text-sm text-gray-500">
        <p>共 {{ students.length }} 位考生，显示 {{ filteredStudentInfo.length }} 位</p>
      </div>
    </el-dialog>

    <!-- 考生详情对话框 -->
    <el-dialog
      v-model="showStudentDetailDialog"
      title="考生详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="currentDetailStudent" class="student-detail-container">
        <div class="detail-section">
          <h3 class="detail-section-title">基本信息</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">姓名</div>
              <div class="detail-value">{{ currentDetailStudent.name }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">科室</div>
              <div class="detail-value">{{ displayDepartment(currentDetailStudent.department) }}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3 class="detail-section-title">分配信息</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">考官一</div>
              <div class="detail-value" :class="{'text-success': currentDetailStudent.examiner1, 'text-gray-400': !currentDetailStudent.examiner1}">
                {{ currentDetailStudent.examiner1 || '未分配' }}
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">考官二</div>
              <div class="detail-value" :class="{'text-success': currentDetailStudent.examiner2, 'text-gray-400': !currentDetailStudent.examiner2}">
                {{ currentDetailStudent.examiner2 || '未分配' }}
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">考题</div>
              <div class="detail-value" :class="{'text-success': currentDetailStudent.examQuestion, 'text-gray-400': !currentDetailStudent.examQuestion}">
                {{ currentDetailStudent.examQuestion || '未分配' }}
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">状态</div>
              <div class="detail-value">
                <el-tag :type="getStudentInfoStatusType(currentDetailStudent)" size="small">
                  {{ getStudentInfoStatusText(currentDetailStudent) }}
                </el-tag>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3 class="detail-section-title">完成进度</h3>
          <div class="progress-container">
            <el-progress 
              :percentage="getCompletionPercentage(currentDetailStudent)"
              :status="getCompletionPercentage(currentDetailStudent) === 100 ? 'success' : undefined"
            />
            <div class="progress-labels">
              <span class="progress-label" :class="{'completed': !!currentDetailStudent.examiner1}">
                考官一
              </span>
              <span class="progress-label" :class="{'completed': !!currentDetailStudent.examiner2}">
                考官二
              </span>
              <span class="progress-label" :class="{'completed': !!currentDetailStudent.examQuestion}">
                考题
              </span>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 抽签参数设置对话框 -->
    <el-dialog
      v-model="showAssignmentSettingsDialog"
      title="抽签参数设置"
      width="800px"
      :close-on-click-modal="false"
    >
      <!-- 考生信息显示 -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 text-center">考生信息</h3>
        <div v-if="currentStudent" class="grid grid-cols-5 gap-4">
          <div class="info-field">
            <div class="info-label text-green-600">姓名：</div>
            <div class="info-value">{{ currentStudent.name || '-' }}</div>
          </div>
          <div class="info-field">
            <div class="info-label text-blue-600">科室：</div>
            <div class="info-value">{{ displayDepartment(currentStudent.department) }}</div>
          </div>
          <div class="info-field">
            <div class="info-label text-green-600">考官一：</div>
            <div class="info-value">{{ currentStudent.examiner1 || '-' }}</div>
          </div>
          <div class="info-field">
            <div class="info-label text-purple-600">考官二：</div>
            <div class="info-value">{{ currentStudent.examiner2 || '-' }}</div>
          </div>
          <div class="info-field">
            <div class="info-label text-orange-600">考题：</div>
            <div class="info-value">{{ currentStudent.examQuestion || '-' }}</div>
          </div>
        </div>
        <div v-else class="text-center text-gray-400 py-4">
          请先选择考生
        </div>
      </div>

      <!-- 抽签参数设置 -->
        <el-form :model="form" label-position="top" size="large">
        <el-form-item label="考生科室代码">
          <el-input 
            v-model="form.studentDept" 
            placeholder="请输入考生所在科室代码"
            :value="currentStudent?.department || form.studentDept"
            @input="form.studentDept = $event"
          />
          </el-form-item>
          
          <el-form-item label="可用考官科室池">
            <el-select 
              v-model="form.availableRooms" 
              multiple 
              placeholder="请选择参与抽签的科室" 
              style="width: 100%"
              tag-type="primary"
            collapse-tags
            collapse-tags-tooltip
            >
              <el-option
                v-for="room in availableRoomOptions"
                :key="room"
                :label="getRoomDisplayLabel(room)"
                :value="room"
              />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">操作区域</el-divider>
          
        <div class="flex flex-col gap-3">
            <el-button 
              type="primary" 
              size="large"
            class="w-full"
            @click="handleStartSpinFromDialog(1)" 
            :loading="loading || isSpinning"
            :disabled="!form.studentDept || form.availableRooms.length === 0"
            >
              <template #icon><User class="w-4 h-4" /></template>
              抽取第一考官
            </el-button>
            <el-button 
              type="success" 
              size="large"
            class="w-full"
            @click="handleStartSpinFromDialog(2)" 
            :loading="loading || isSpinning" 
            :disabled="!result1 || !form.studentDept"
          >
            <template #icon><Users class="w-4 h-4" /></template>
            抽取第二考官
          </el-button>
          <el-button 
            type="warning" 
            size="large"
            class="w-full"
            @click="handleAssignExamFromDialog"
              :loading="loading" 
              :disabled="!result1"
            >
            <template #icon><FileText class="w-4 h-4" /></template>
            分配考题
            </el-button>
          </div>
        </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAssignmentSettingsDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
        
    <!-- 添加考生对话框 -->
    <el-dialog
      v-model="showAddStudentDialog"
      title="添加考生"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="newStudentForm" label-width="100px" label-position="left">
        <el-form-item label="姓名" required>
          <el-input 
            v-model="newStudentForm.name" 
            placeholder="请输入考生姓名"
            clearable
          />
        </el-form-item>
        <el-form-item label="科室" required>
          <el-select 
            v-model="newStudentForm.department" 
            placeholder="请选择科室"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="dept in departmentList"
              :key="dept.code"
              :label="dept.name"
              :value="dept.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所在班组" required>
          <el-select 
            v-model="newStudentForm.group" 
            placeholder="请选择所在班组"
            style="width: 100%"
            filterable
            allow-create
            default-first-option
          >
            <el-option
              v-for="group in groupList"
              :key="group"
              :label="group"
              :value="group"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddStudentDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleAddStudentConfirm"
            :disabled="!newStudentForm.name || !newStudentForm.department || !newStudentForm.group"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Excel导入对话框 -->
    <el-dialog
      v-model="showImportDialog"
      title="导入考生数据"
      width="900px"
      :close-on-click-modal="false"
    >
      <!-- 文件上传区域 -->
      <div v-if="!parsedImportData || parsedImportData.length === 0">
        <el-upload
          class="upload-demo"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          accept=".xlsx,.xls,.csv"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
            </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .xlsx, .xls, .csv 格式文件<br>
              <strong>必填字段：</strong>姓名、科室、所在班组<br>
              <strong>可选字段：</strong>考官一、考官二、考题
            </div>
          </template>
        </el-upload>
          </div>

      <!-- 数据预览区域 -->
      <div v-else>
        <div class="mb-4">
          <el-alert
            :type="importValidation.hasErrors ? 'error' : 'success'"
            :title="importValidation.hasErrors ? `发现 ${importValidation.errors.length} 个错误` : `成功解析 ${parsedImportData.length} 条考生数据`"
            :closable="false"
            show-icon
          />
        </div>

        <div v-if="importValidation.errors.length > 0" class="mb-4">
          <el-alert
            type="error"
            title="数据验证错误"
            :closable="false"
          >
            <ul class="error-list">
              <li v-for="(error, index) in importValidation.errors" :key="index">
                {{ error }}
              </li>
            </ul>
          </el-alert>
        </div>

        <div v-if="importValidation.warnings.length > 0" class="mb-4">
          <el-alert
            type="warning"
            title="数据警告"
            :closable="false"
          >
            <ul class="warning-list">
              <li v-for="(warning, index) in importValidation.warnings" :key="index">
                {{ warning }}
              </li>
            </ul>
          </el-alert>
        </div>

        <div class="preview-table-container">
          <el-table
            :data="parsedImportData"
            border
            stripe
            max-height="400"
            style="width: 100%"
          >
            <el-table-column prop="name" label="姓名" width="120" :class-name="getValidationClass('name')">
              <template #default="scope">
                <el-input
                  v-if="editingCell.row === scope.$index && editingCell.field === 'name'"
                  v-model="scope.row.name"
                  size="small"
                  @blur="finishEditing(scope.$index, 'name')"
                  @keyup.enter="finishEditing(scope.$index, 'name')"
                  ref="nameInputRef"
                  :class="{'input-error': !scope.row._valid.name}"
                />
                <span 
                  v-else
                  :class="{'text-error': !scope.row._valid.name, 'editable-cell': true}"
                  @click="startEditing(scope.$index, 'name')"
                >
                  {{ scope.row.name || '(空)' }}
                  <el-icon class="edit-icon"><Edit /></el-icon>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="department" label="科室" width="130" :class-name="getValidationClass('department')">
              <template #default="scope">
                <el-select
                  v-if="editingCell.row === scope.$index && editingCell.field === 'department'"
                  v-model="scope.row.department"
                  size="small"
                  filterable
                  allow-create
                  @blur="finishEditing(scope.$index, 'department')"
                  @change="finishEditing(scope.$index, 'department')"
                  :class="{'input-error': !scope.row._valid.department}"
                >
                  <el-option
                    v-for="dept in departmentList"
                    :key="dept.name"
                    :label="dept.name"
                    :value="dept.name"
                  />
                </el-select>
                <span 
                  v-else
                  :class="{'text-error': !scope.row._valid.department, 'editable-cell': true}"
                  @click="startEditing(scope.$index, 'department')"
                >
                  {{ scope.row.department || '(空)' }}
                  <el-icon class="edit-icon"><Edit /></el-icon>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="group" label="班组" width="100" :class-name="getValidationClass('group')">
              <template #default="scope">
                <el-select
                  v-if="editingCell.row === scope.$index && editingCell.field === 'group'"
                  v-model="scope.row.group"
                  size="small"
                  filterable
                  allow-create
                  @blur="finishEditing(scope.$index, 'group')"
                  @change="finishEditing(scope.$index, 'group')"
                  :class="{'input-error': !scope.row._valid.group}"
                >
                  <el-option
                    v-for="group in groupList"
                    :key="group"
                    :label="group"
                    :value="group"
                  />
                </el-select>
                <span 
                  v-else
                  :class="{'text-error': !scope.row._valid.group, 'editable-cell': true}"
                  @click="startEditing(scope.$index, 'group')"
                >
                  {{ scope.row.group || '(空)' }}
                  <el-icon class="edit-icon"><Edit /></el-icon>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="examiner1" label="考官一" width="90" align="center">
              <template #default="scope">
                <span :class="{'text-success': scope.row.examiner1}">
                  {{ scope.row.examiner1 || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="examiner2" label="考官二" width="90" align="center">
              <template #default="scope">
                <span :class="{'text-success': scope.row.examiner2}">
                  {{ scope.row.examiner2 || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="examQuestion" label="考题" width="80" align="center">
              <template #default="scope">
                <span :class="{'text-success': scope.row.examQuestion}">
                  {{ scope.row.examQuestion || '-' }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="scope">
                <el-tag :type="scope.row._valid.all ? 'success' : 'danger'" size="small">
                  {{ scope.row._valid.all ? '有效' : '无效' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="scope">
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeImportRow(scope.$index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="mt-4 text-sm text-gray-500">
          <p>共 {{ parsedImportData.length }} 条数据，其中有效数据 {{ validImportDataCount }} 条，无效数据 {{ parsedImportData.length - validImportDataCount }} 条</p>
          <p class="mt-1 text-blue-600">提示：点击表格中的单元格可直接编辑缺失信息，红色标记表示必填字段为空</p>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetImport">重新选择</el-button>
          <el-button @click="showImportDialog = false">取消</el-button>
            <el-button 
            type="primary" 
            @click="confirmImport" 
            :loading="importing"
            :disabled="!parsedImportData || parsedImportData.length === 0 || importValidation.hasErrors"
          >
            确认导入
            </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 管理员身份验证对话框 -->
    <el-dialog
      v-model="showAdminAuthDialog"
      title="管理员身份验证"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item label="管理员密码">
          <el-input
            v-model="adminPassword"
            type="password"
            placeholder="请输入管理员密码"
            show-password
            @keyup.enter="verifyAdminPassword"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAdminAuthDialog = false">取消</el-button>
          <el-button type="primary" @click="verifyAdminPassword">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 数据备份与恢复对话框 -->
    <el-dialog
      v-model="showBackupDialog"
      title="数据备份与恢复"
      width="900px"
      :close-on-click-modal="false"
    >
      <div class="backup-actions mb-4">
        <el-button type="primary" @click="createBackup">
          <template #icon><Download class="w-4 h-4" /></template>
          创建备份
        </el-button>
        <span class="text-sm text-gray-500 ml-2">最多保留10个备份，超过后自动删除最早的备份</span>
      </div>

      <el-table
        :data="backupList"
        border
        stripe
        max-height="400"
        style="width: 100%"
      >
        <el-table-column prop="id" label="序号" width="80" />
        <el-table-column label="备份时间" width="180">
          <template #default="scope">
            {{ scope.row.timestamp.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="studentCount" label="考生数量" width="120" />
        <el-table-column label="操作" width="300">
          <template #default="scope">
            <el-button size="small" type="primary" @click="restoreBackup(scope.row)">
              <template #icon><RefreshCw class="w-4 h-4" /></template>
              恢复
            </el-button>
            <el-button size="small" @click="exportBackup(scope.row)">
              <template #icon><Download class="w-4 h-4" /></template>
              导出
            </el-button>
            <el-button size="small" type="danger" @click="deleteBackup(scope.row.id)">
              <template #icon><Delete class="w-4 h-4" /></template>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="backupList.length === 0" class="empty-state">
        <el-empty description="暂无备份数据" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Home, Users, Calendar, ChevronLeft, Shuffle, User, UserPlus, AlertCircle, CheckCircle2, Upload, Download, FileText, Search, Settings, Edit, Delete, RefreshCw, Trash2 } from 'lucide-vue-next';
import { instructorAssignmentService } from '../services/instructorAssignmentService';
import { ElMessage, ElDialog, ElUpload, ElMessageBox } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import SpinWheel from '../components/SpinWheel.vue';

import DepartmentCodeManager from '../components/DepartmentCodeManager.vue';
import InterconnectSettings from '../components/InterconnectSettings.vue';
import ExamConfig from '../components/ExamConfig.vue';
import { assignmentDataService, type AssignmentStudent } from '../services/assignmentDataService';
import { 
  spinWheelPreprocessService, 
  type DepartmentAvailability, 
  type SmartRecommendation 
} from '../services/spinWheelPreprocessService';
import { dutyRotationService } from '../services/dutyRotationService';
import { normalizeDeptToFull } from '../utils/departmentNormalizer';

// 🆕 科室名称显示转换函数（统一显示为"区域X室"格式）
const displayDepartment = (dept: string | undefined | null): string => {
  if (!dept) return '-'
  return normalizeDeptToFull(dept)
}
import * as XLSX from 'xlsx';
// @ts-ignore
import ExcelJS from 'exceljs';

interface Student {
  name: string;
  department: string;
  group?: string; // 班组信息
  examiner1?: string;
  examiner2?: string;
  examQuestion?: string;
}

const route = useRoute();

// 存储键常量
const STORAGE_KEY_STUDENTS = 'instructor_assignment_students';
const STORAGE_KEY_HISTORY = 'instructor_assignment_history';
const STORAGE_KEY_LOGS = 'instructor_assignment_logs';
const STORAGE_KEY_SETTINGS = 'instructor_assignment_settings';
const STORAGE_KEY_BACKUP = 'instructor_assignment_backup';
const STORAGE_KEY_ADMIN_PASSWORD = 'instructor_assignment_admin_password';

// 响应式数据定义
const students = ref<Student[]>([]);
const selectedStudent = ref<string>('');
const currentStudent = computed(() => students.value.find(s => s.name === selectedStudent.value));
const form = reactive({
  studentDept: '',
  availableRooms: [] as string[]
});
const result1 = ref<string>('');
const result2 = ref<string>('');

// 🆕 智能预处理相关数据
const examDateRange = ref<[string, string]>(['', '']); // 考试日期范围
const departmentAvailability = ref<Map<string, DepartmentAvailability>>(new Map());
const smartRecommendation = ref<SmartRecommendation | null>(null);
const showSmartRecommendation = ref(false);
const isAnalyzingAvailability = ref(false);
const loading = ref(false);
const message = ref('');
const isError = ref(false);
const isSpinning = ref(false);
const spinWheelRef = ref<InstanceType<typeof SpinWheel> | null>(null);

const wheelAreaRef = ref<HTMLDivElement | null>(null);

const wheelSize = ref(920);
const dialSize = ref(80);
const dialItemHeight = ref(80);
const dialVisibleCount = ref(7);

let wheelAreaResizeObserver: ResizeObserver | null = null;
const wheelCandidateRooms = ref<string[]>([]);
const wheelDisplayRooms = ref<string[]>([]);
const wheelDisplayLabels = ref<string[]>([]);
const availableRoomOptions = ref<string[]>([]);
const operationLogs = ref<OperationLog[]>([]);
const historyRecords = ref<HistoryRecord[]>([]);
const statistics = reactive({
  totalStudents: 0,
  assignedStudents: 0,
  todayAssignments: 0,
  totalOperations: 0,
  actionDistribution: {} as Record<string, number>
});
const parsedImportData = ref<ImportStudentData[]>([]);
const importValidation = reactive({
  hasErrors: false,
  errors: [] as string[],
  warnings: [] as string[]
});
const fileList = ref<any[]>([]);
const importing = ref(false);
const showImportDialog = ref(false);
const editingCell = reactive({
  row: -1,
  field: ''
});
const nameInputRef = ref();
const historyFilterType = ref<string>('all');
const historySearchText = ref<string>('');
let statsRefreshDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingAssignmentType = 0;
let pendingAvailableCount = 0;

// 接口定义
interface OperationLog {
  timestamp: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface HistoryRecord {
  id: string;
  timestamp: number;
  student: string;
  action: string;
  result: string;
  details?: any;
}

interface ImportStudentData {
  name: string;
  department: string;
  group: string;
  examiner1?: string;
  examiner2?: string;
  examQuestion?: string;
  _valid: {
    name: boolean;
    department: boolean;
    group: boolean;
    all: boolean;
  };
}

// 辅助函数：检查学生是否已完成分配
const isStudentCompleted = (student: Student): boolean => {
  if (!student) return false;
  return !!(student.examiner1 && student.examiner2 && student.examQuestion);
};

// 辅助函数：检查学生是否部分完成（有考官一或考官二，但没有全部完成）
const isStudentPartial = (student: Student): boolean => {
  if (!student) return false;
  const hasExaminer1 = !!student.examiner1;
  const hasExaminer2 = !!student.examiner2;
  const hasExamQuestion = !!student.examQuestion;
  // 部分完成：有至少一个考官或考题，但没有全部完成
  return (hasExaminer1 || hasExaminer2 || hasExamQuestion) && !isStudentCompleted(student);
};

// 辅助函数：检查学生是否待处理（没有任何分配）
const isStudentPending = (student: Student): boolean => {
  if (!student) return true;
  return !student.examiner1 && !student.examiner2 && !student.examQuestion;
};

// 辅助函数：获取学生徽章类名
const getStudentBadgeClass = (student: Student): string => {
  if (isStudentCompleted(student)) return 'badge-completed';
  if (isStudentPartial(student)) return 'badge-partial';
  return 'badge-pending';
};

// 辅助函数：获取学生徽章文本
const getStudentBadgeText = (student: Student): string => {
  if (isStudentCompleted(student)) return '已完成';
  if (isStudentPartial(student)) return '进行中';
  return '待处理';
};

// 辅助函数：获取学生状态圆点类名
const getStudentStatusDotClass = (student: Student): string => {
  if (isStudentCompleted(student)) return 'status-dot-completed';
  if (isStudentPartial(student)) return 'status-dot-partial';
  return 'status-dot-pending';
};

// 辅助函数：科室代码和名称转换
const resolveDeptCode = (deptName: string): string => {
  if (!deptName) return '';
  
  const dept = departmentList.value.find(d => d.name === deptName);
  if (dept) return dept.code;
  
  const deptByCode = departmentList.value.find(d => d.code === deptName);
  if (deptByCode) return deptByCode.code;
  
  const fuzzyMatch = departmentList.value.find(d => {
    const deptSimpleName = d.name.replace(/^[一二三四五六七八九十]+室/, '');
    const inputSimpleName = deptName.replace(/^[一二三四五六七八九十]+室/, '');
    return deptSimpleName === inputSimpleName || 
           d.name.includes(deptName) || 
           deptName.includes(d.name);
  });
  
  if (fuzzyMatch) return fuzzyMatch.code;
  
  const numberMatch = deptName.match(/([一二三四五六七八九十]+)室/);
  if (numberMatch) {
    const numberDept = departmentList.value.find(d => d.name === `${numberMatch[1]}室`);
    if (numberDept) return numberDept.code;
  }
  
  return deptName;
};

const isSameDepartment = (dept1: string, dept2: string): boolean => {
  if (!dept1 || !dept2) return false;
  if (dept1 === dept2) return true;
  
  const code1 = resolveDeptCode(dept1);
  const code2 = resolveDeptCode(dept2);
  
  if (code1 === code2) return true;
  
  const dept1Obj = departmentList.value.find(d => d.code === code1);
  const dept2Obj = departmentList.value.find(d => d.code === code2);
  
  if (dept1Obj && dept2Obj && dept1Obj.name === dept2Obj.name) return true;
  
  const numberMatch1 = dept1.match(/([一二三四五六七八九十]+)室/);
  const numberMatch2 = dept2.match(/([一二三四五六七八九十]+)室/);
  if (numberMatch1 && numberMatch2 && numberMatch1[1] === numberMatch2[1]) return true;
  
  return false;
};

const getDeptNameForExport = (deptCode: string): string => {
  if (!deptCode) return '';
  
  // 1. 直接匹配代码
  const deptByCode = departmentList.value.find(d => d.code === deptCode);
  if (deptByCode) return deptByCode.name;
  
  // 2. 如果输入已经是名称，直接返回
  const deptByName = departmentList.value.find(d => d.name === deptCode);
  if (deptByName) return deptByName.name;
  
  // 3. 去除"室"后缀后匹配代码（处理 "H室" 格式）
  const codeWithoutShi = deptCode.replace(/室$/, '');
  const deptByCodeNoShi = departmentList.value.find(d => d.code === codeWithoutShi);
  if (deptByCodeNoShi) return deptByCodeNoShi.name;
  
  // 4. 去除"区域"前缀后匹配
  const normalizedInput = deptCode.replace(/^区域/, '');
  const deptByNormalized = departmentList.value.find(d => d.name === normalizedInput || d.name.replace(/^区域/, '') === normalizedInput);
  if (deptByNormalized) return deptByNormalized.name;
  
  // 5. 如果都找不到，返回原始值
  return deptCode;
};

const getRoomDisplayLabel = (room: string): string => {
  if (!room) return '';
  
  const dept = departmentList.value.find(d => d.code === room || d.name === room);
  return dept ? dept.name : room;
};

// 获取过滤后的可用科室（考虑互通规则）
const getFilteredRoomsForRequest = (type: number): string[] => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1207',message:'开始过滤可用科室',data:{type,studentDept:form.studentDept,examiner1:result1.value,availableRoomsCount:form.availableRooms.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  let available = [...form.availableRooms];
  const studentDeptCode = resolveDeptCode(form.studentDept);
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1215',message:'学生科室代码',data:{studentDeptCode,originalStudentDept:form.studentDept},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  // 规则1：考官一不能与考生同科室（包括互通组）
  if (type === 1 && studentDeptCode) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1218',message:'考官一：开始排除学生同科室',data:{studentDeptCode,originalStudentDept:form.studentDept,beforeFilter:available.length,availableRooms:available,interconnectGroups:interconnectGroups.value},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    
    // 找到包含学生科室的互通组
    // 科室互通的意思是：如果考生科室在互通组中，那么整个互通组都被视为同一个科室
    const studentGroup = interconnectGroups.value.find(g => {
      // 检查学生科室代码是否在互通组中
      if (g.codes.includes(studentDeptCode)) return true;
      // 检查学生科室名称是否对应互通组中的某个科室
      const studentDept = departmentList.value.find(d => d.code === studentDeptCode || d.name === form.studentDept);
      if (studentDept && g.codes.includes(studentDept.code)) return true;
      // 检查互通组中是否有科室名称匹配
      return g.codes.some(code => {
        const dept = departmentList.value.find(d => d.code === code);
        return dept && (dept.name === form.studentDept || dept.code === studentDeptCode);
      });
    });
    
    // #region agent log
    if (studentGroup) {
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1228',message:'考官一：找到互通组',data:{studentGroupCodes:studentGroup.codes,studentGroupNames:studentGroup.names},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5'})}).catch(()=>{});
    }
    // #endregion
    
    // 排除学生所在科室和互通组中的所有科室
    available = available.filter(room => {
      const roomCode = resolveDeptCode(room);
      const roomName = room;
      
      const isStudentDept = isSameDepartment(room, form.studentDept);
      
      let isInInterconnectGroup = false;
      if (studentGroup) {
        isInInterconnectGroup = studentGroup.codes.includes(roomCode) ||
                               studentGroup.codes.some(code => {
                                 const dept = departmentList.value.find(d => d.code === code);
                                 return dept && (dept.name === roomName || dept.code === roomCode);
                               }) ||
                               studentGroup.names?.some(name => name === roomName);
      }
      
      const shouldExclude = isStudentDept || isInInterconnectGroup;
      
      return !shouldExclude;
    });
  }
  
  // 规则2：考官二不能与考生和考官一同科室
  if (type === 2) {
    const examiner1Code = result1.value ? resolveDeptCode(result1.value) : null;
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1250',message:'考官二：开始过滤',data:{examiner1Code,examiner1Original:result1.value,studentDeptCode,beforeFilter:available.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    
    // 排除考官一所在科室（包括互通组）
    if (examiner1Code) {
      // 找到包含考官一科室的互通组
      const examiner1Group = interconnectGroups.value.find(g => {
        if (g.codes.includes(examiner1Code)) return true;
        const examiner1Dept = departmentList.value.find(d => d.code === examiner1Code || d.name === result1.value);
        if (examiner1Dept && g.codes.includes(examiner1Dept.code)) return true;
        return g.codes.some(code => {
          const dept = departmentList.value.find(d => d.code === code);
          return dept && (dept.name === result1.value || dept.code === examiner1Code);
        });
      });
      
      // #region agent log
      if (examiner1Group) {
        fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1285',message:'考官二：找到考官一互通组',data:{examiner1GroupCodes:examiner1Group.codes,examiner1GroupNames:examiner1Group.names},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6'})}).catch(()=>{});
      }
      // #endregion
      
      available = available.filter(room => {
        const roomCode = resolveDeptCode(room);
        const roomName = room;
        
        const isExaminer1Dept = isSameDepartment(room, result1.value);
        
        let isInExaminer1Group = false;
        if (examiner1Group) {
          isInExaminer1Group = examiner1Group.codes.includes(roomCode) ||
                              examiner1Group.codes.some(code => {
                                const dept = departmentList.value.find(d => d.code === code);
                                return dept && (dept.name === roomName || dept.code === roomCode);
                              }) ||
                              examiner1Group.names?.some(name => name === roomName);
        }
        
        const shouldExclude = isExaminer1Dept || isInExaminer1Group;
        
        return !shouldExclude;
      });
    }
    
    // 排除学生所在科室（包括互通组）
    if (studentDeptCode) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1279',message:'考官二：开始排除学生同科室',data:{studentDeptCode,originalStudentDept:form.studentDept,interconnectGroups:interconnectGroups.value},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      
      // 找到包含学生科室的互通组
      // 科室互通的意思是：如果考生科室在互通组中，那么整个互通组都被视为同一个科室
      const studentGroup = interconnectGroups.value.find(g => {
        // 检查学生科室代码是否在互通组中
        if (g.codes.includes(studentDeptCode)) return true;
        // 检查学生科室名称是否对应互通组中的某个科室
        const studentDept = departmentList.value.find(d => d.code === studentDeptCode || d.name === form.studentDept);
        if (studentDept && g.codes.includes(studentDept.code)) return true;
        // 检查互通组中是否有科室名称匹配
        return g.codes.some(code => {
          const dept = departmentList.value.find(d => d.code === code);
          return dept && (dept.name === form.studentDept || dept.code === studentDeptCode);
        });
      });
      
      // #region agent log
      if (studentGroup) {
        fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1295',message:'考官二：找到互通组',data:{studentGroupCodes:studentGroup.codes,studentGroupNames:studentGroup.names},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6'})}).catch(()=>{});
      }
      // #endregion
      
      // 排除学生所在科室和互通组中的所有科室
      available = available.filter(room => {
        const roomCode = resolveDeptCode(room);
        const roomName = room;
        
        const isStudentDept = isSameDepartment(room, form.studentDept);
        
        let isInInterconnectGroup = false;
        if (studentGroup) {
          isInInterconnectGroup = studentGroup.codes.includes(roomCode) ||
                                 studentGroup.codes.some(code => {
                                   const dept = departmentList.value.find(d => d.code === code);
                                   return dept && (dept.name === roomName || dept.code === roomCode);
                                 }) ||
                                 studentGroup.names?.some(name => name === roomName);
        }
        
        const shouldExclude = isStudentDept || isInInterconnectGroup;
        
        return !shouldExclude;
      });
    }
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:1295',message:'过滤完成',data:{type,afterFilter:available.length,filteredRooms:available.map(r=>resolveDeptCode(r))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:type===1?'H5':'H6'})}).catch(()=>{});
  // #endregion
  
  // 转换为代码格式返回
  return available.map(room => resolveDeptCode(room));
};

// 设置加载和保存函数
const loadSettingsFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.departmentList) {
        departmentList.value = settings.departmentList;
      }
      if (settings.interconnectGroups) {
        interconnectGroups.value = settings.interconnectGroups;
      }
      if (settings.examQuestionCount !== undefined) {
        examQuestionCount.value = settings.examQuestionCount;
      }
      if (settings.availableRoomOptions) {
        availableRoomOptions.value = settings.availableRoomOptions;
        form.availableRooms = [...settings.availableRoomOptions];
      } else if (departmentList.value.length > 0) {
        availableRoomOptions.value = departmentList.value.map(d => d.name);
        form.availableRooms = [...availableRoomOptions.value];
      }
    } else {
      // 默认设置
      if (departmentList.value.length > 0) {
        availableRoomOptions.value = departmentList.value.map(d => d.name);
        form.availableRooms = [...availableRoomOptions.value];
      }
    }
    
    // 初始化转盘显示数据
    if (form.availableRooms.length > 0) {
      wheelDisplayRooms.value = form.availableRooms.map(room => resolveDeptCode(room));
      wheelDisplayLabels.value = form.availableRooms.map(room => resolveDeptCode(room));
    }
  } catch (err) {
    console.error('加载设置失败:', err);
    // 默认设置
    if (departmentList.value.length > 0) {
      availableRoomOptions.value = departmentList.value.map(d => d.name);
      form.availableRooms = [...availableRoomOptions.value];
      wheelDisplayRooms.value = availableRoomOptions.value.map(room => resolveDeptCode(room));
      wheelDisplayLabels.value = availableRoomOptions.value.map(room => resolveDeptCode(room));
    }
  }
};

const saveSettingsToStorage = () => {
  try {
    const settings = {
      departmentList: departmentList.value,
      interconnectGroups: interconnectGroups.value,
      examQuestionCount: examQuestionCount.value,
      availableRoomOptions: availableRoomOptions.value
    };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('保存设置失败:', err);
  }
};

// 在组件挂载时初始化数据
onMounted(() => {
  console.log('[InstructorAssignmentPage] 组件已挂载，开始初始化');

  loadSettingsFromStorage();
  loadStudentsFromStorage();
  loadLogsFromStorage();
  loadHistoryFromStorage();

  // #region agent log
  nextTick(() => {
    // Compare with other pages
    const thisPage = {
      sidebar: document.querySelector('#instructor-assignment-page .sidebar') as HTMLElement,
      sidebarToggle: document.querySelector('#instructor-assignment-page .sidebar .sidebar-toggle') as HTMLElement,
      mainContent: document.querySelector('#instructor-assignment-page .main-content') as HTMLElement,
      appContainer: document.querySelector('#instructor-assignment-page') as HTMLElement
    };
    
    // Check if we can find elements from other pages (for comparison)
    const homePage = {
      sidebar: document.querySelector('.app-container .sidebar') as HTMLElement,
      sidebarToggle: document.querySelector('.app-container .sidebar-toggle') as HTMLElement,
      mainContent: document.querySelector('.app-container .main-content') as HTMLElement
    };
    
    const getStyleInfo = (el: HTMLElement | null) => {
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        position: style.position,
        zIndex: style.zIndex,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        rect: el.getBoundingClientRect()
      };
    };
    
    const comparison = {
      thisPage: {
        sidebar: getStyleInfo(thisPage.sidebar),
        sidebarToggle: getStyleInfo(thisPage.sidebarToggle),
        mainContent: getStyleInfo(thisPage.mainContent),
        appContainer: getStyleInfo(thisPage.appContainer)
      },
      homePage: {
        sidebar: getStyleInfo(homePage.sidebar),
        sidebarToggle: getStyleInfo(homePage.sidebarToggle),
        mainContent: getStyleInfo(homePage.mainContent)
      }
    };
    
    fetch('http://127.0.0.1:7245/ingest/bc33d6a7-c361-4ce6-8555-cf86753b7b19', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'InstructorAssignmentPage.vue:onMounted:comparison',
        message: 'Comparing sidebar styles between pages',
        data: comparison,
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'F'
      })
    }).catch(() => {});
  });
  // #endregion

  nextTick(() => {
    const el = wheelAreaRef.value;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
    const updateSizes = () => {
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;

      const baseWheel = 920;
      const baseDialSize = 160;
      const baseDialItemHeight = 80;
      const baseDialVisible = 7;
      const baseSpacing = 56;

      const baseDialWidth = baseDialItemHeight * baseDialVisible;
      const baseW = Math.max(baseWheel, baseDialWidth) + 48;
      const baseH = baseWheel + baseDialSize + baseSpacing;

      const scale = clamp(Math.min(w / baseW, h / baseH), 0.42, 1);

      wheelSize.value = Math.round(baseWheel * scale);
      dialSize.value = Math.round(baseDialSize * scale * 0.5);
      dialItemHeight.value = Math.round(baseDialItemHeight * scale);
      dialVisibleCount.value = scale < 0.62 ? 5 : 7;
    };

    updateSizes();
    wheelAreaResizeObserver = new ResizeObserver(() => updateSizes());
    wheelAreaResizeObserver.observe(el);
  });
});

// 清理跑马灯定时器
onUnmounted(() => {
  if (examQuestionMarqueeInterval.value !== null) {
    clearTimeout(examQuestionMarqueeInterval.value);
    examQuestionMarqueeInterval.value = null;
  }
  
  if (wheelAreaResizeObserver && wheelAreaRef.value) {
    wheelAreaResizeObserver.unobserve(wheelAreaRef.value);
  }
  wheelAreaResizeObserver?.disconnect();
  wheelAreaResizeObserver = null;
});

// 侧边栏状态
const sidebarCollapsed = ref(false);
const appVersion = ref(import.meta.env.VITE_APP_VERSION || '6.1.0');

// 切换侧边栏
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

// 数据校验函数
const validateAssignmentData = (apiResponse: any, requestRooms: string[]): { valid: boolean; error?: string; roomIndex?: number } => {
  if (!apiResponse?.success || !apiResponse?.suggested_room) {
    return { valid: false, error: 'API返回数据无效' };
  }

  const suggestedRoomCode = resolveDeptCode(apiResponse.suggested_room);
  
  if (!suggestedRoomCode) {
    return { valid: false, error: 'API返回的科室代码为空' };
  }

  // 检查API返回的科室是否在请求的科室列表中
  let roomIndex = -1;
  for (let i = 0; i < requestRooms.length; i++) {
    const roomCode = resolveDeptCode(requestRooms[i]);
    if (roomCode === suggestedRoomCode) {
      roomIndex = i;
      break;
    }
  }

  if (roomIndex < 0) {
    console.error(`[InstructorAssignmentPage] 数据不一致: API返回科室代码 ${suggestedRoomCode} 不在请求的科室列表中`, {
      suggestedRoom: apiResponse.suggested_room,
      suggestedRoomCode,
      requestRooms: requestRooms.map(r => ({ name: r, code: resolveDeptCode(r) }))
    });
    return { valid: false, error: `API返回的科室代码 ${suggestedRoomCode} 不在可用科室列表中` };
  }

  return { valid: true, roomIndex };
};

const startSpin = async (type: number) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:startSpin:entry',message:'startSpin called',data:{type,studentDept:form.studentDept,availableRooms:form.availableRooms,smartRec:smartRecommendation.value?{examiner1Dept:smartRecommendation.value.examiner1Dept,examiner2Dept:smartRecommendation.value.examiner2Dept,confidence:smartRecommendation.value.confidence}:null,currentStudent:currentStudent.value?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!form.studentDept) {
    ElMessage.warning('请输入考生科室代码');
    return;
  }

  if (form.availableRooms.length === 0) {
    ElMessage.warning('请选择至少一个可用科室');
    return;
  }

  pendingAssignmentType = type;
  loading.value = true;
  message.value = '';
  isError.value = false;

  const requestRooms = getFilteredRoomsForRequest(type);
  
  if (requestRooms.length === 0) {
    loading.value = false;
    pendingAssignmentType = 0;
    ElMessage.warning('没有可用科室满足回避规则');
    return;
  }

  wheelCandidateRooms.value = requestRooms;
  wheelDisplayRooms.value = form.availableRooms.map(room => resolveDeptCode(room));
  wheelDisplayLabels.value = form.availableRooms.map(room => resolveDeptCode(room));
  pendingAvailableCount = requestRooms.length;

  if (spinWheelRef.value && (spinWheelRef.value as any).startPreparing) {
    (spinWheelRef.value as any).startPreparing();
    isSpinning.value = true;
  }

  // 获取智能推荐科室作为参考（转盘会优先考虑推荐科室，但仍保持随机性）
  const recommendedRoom = type === 1 
    ? smartRecommendation.value?.examiner1Dept 
    : smartRecommendation.value?.examiner2Dept;

  const apiRequestData = {
    action: 'suggest_assignment',
    student_dept: resolveDeptCode(form.studentDept),
    available_rooms: requestRooms,
    assignment_type: type,
    exclude_examiner: type === 2 ? resolveDeptCode(result1.value) : undefined,
    // 🆕 传递智能推荐科室作为参考（后端可选择性使用）
    preferred_room: recommendedRoom ? resolveDeptCode(recommendedRoom) : undefined,
    recommendation_confidence: smartRecommendation.value?.confidence || 0
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:startSpin:beforeAPI',message:'完整的API请求数据',data:{type,formStudentDept:form.studentDept,apiStudentDept:apiRequestData.student_dept,apiAvailableRooms:apiRequestData.available_rooms,apiPreferredRoom:apiRequestData.preferred_room,requestRoomsRaw:requestRooms,formAvailableRooms:form.availableRooms},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'VERIFY_API_DATA'})}).catch(()=>{});
  // #endregion

  try {
    const res = await instructorAssignmentService.run(apiRequestData);

    // #region agent log
    const recRoom = type === 1 ? smartRecommendation.value?.examiner1Dept : smartRecommendation.value?.examiner2Dept;
    const apiRoom = res.data?.suggested_room;
    const matchResult = recRoom && apiRoom ? (resolveDeptCode(apiRoom) === resolveDeptCode(recRoom) ? '✓ 匹配' : '✗ 不匹配') : '无推荐';
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:startSpin:apiResult',message:'API结果与推荐对比',data:{examinerType:type===1?'考官一':'考官二',apiSuggestedRoom:apiRoom,recommendedRoom:recRoom||'无推荐',matchStatus:matchResult,apiSuccess:res.success&&res.data?.success},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'VERIFY_REC'})}).catch(()=>{});
    // #endregion

    if (res.success && res.data?.success && res.data?.suggested_room) {
      const selectedRoomCode = resolveDeptCode(res.data.suggested_room);
      const roomsList = wheelDisplayRooms.value;
      
      const roomIndex = roomsList.findIndex(room => resolveDeptCode(room) === selectedRoomCode);
      
      if (roomIndex >= 0 && spinWheelRef.value) {
        isSpinning.value = true;
        spinWheelRef.value.spinTo(roomIndex);
      } else {
        finishAssignment(type, selectedRoomCode, res.data.available_count || 0);
        wheelCandidateRooms.value = [];
      }
    } else {
      loading.value = false;
      isError.value = true;
      message.value = res.data?.reason || res.data?.error || res.error?.message || '分配失败';
      ElMessage.error(message.value);
      wheelCandidateRooms.value = [];
    }
  } catch (err: any) {
    loading.value = false;
    isError.value = true;
    message.value = err.message || '系统错误';
    ElMessage.error(message.value);
    wheelCandidateRooms.value = [];
  }
};

// 转盘动画完成回调
const onWheelFinished = (index: number) => {
  isSpinning.value = false;
  loading.value = false;
  
  // 获取选中的科室
  const roomsList = wheelDisplayRooms.value;
  const selectedRoom = roomsList[index];
  
  if (selectedRoom && pendingAssignmentType > 0) {
    finishAssignment(pendingAssignmentType, selectedRoom, pendingAvailableCount || roomsList.length);
    pendingAssignmentType = 0;
    pendingAvailableCount = 0;
    wheelCandidateRooms.value = [];
  }
};

// 考生管理
const selectStudent = (name: string) => {
  if (!name) return;
  
  selectedStudent.value = name;
  onStudentChange(name);
};

const onStudentChange = (name: string) => {
  if (!name) return;
  
  let student = students.value.find(s => s.name === name);
  if (!student) {
    // 创建新考生
    student = {
      name,
      department: form.studentDept || '',
      examiner1: '',
      examiner2: '',
      examQuestion: ''
    };
    students.value.push(student);
  }
  
  // 更新表单和结果显示
  form.studentDept = student.department;
  result1.value = student.examiner1 || '';
  result2.value = student.examiner2 || '';
};

// 添加考生对话框状态
const showAddStudentDialog = ref(false);
const newStudentForm = reactive({
  name: '',
  department: '',
  group: ''
});

const addStudent = () => {
  // 重置表单
  newStudentForm.name = '';
  newStudentForm.department = '';
  newStudentForm.group = '';
  showAddStudentDialog.value = true;
};

// 清空所有考生数据
const clearAllStudents = async () => {
  if (students.value.length === 0) {
    ElMessage.warning('当前没有考生数据');
    return;
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要清空所有 ${students.value.length} 位考生数据吗？此操作不可恢复。`,
      '确认清空',
      {
        confirmButtonText: '确定清空',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    // 清空考生列表
    students.value = [];
    selectedStudent.value = '';
    
    // 重置相关状态
    result1.value = '';
    result2.value = '';
    form.studentDept = '';
    smartRecommendation.value = null;
    
    // 清除localStorage中的数据
    localStorage.removeItem('assignment_students');
    assignmentDataService.clearAssignmentData();
    
    ElMessage.success('已清空所有考生数据');
    addLog('info', '清空了所有考生数据');
  } catch {
    // 用户取消操作
  }
};

// 确认添加考生
const handleAddStudentConfirm = () => {
  if (!newStudentForm.name || !newStudentForm.department || !newStudentForm.group) {
    ElMessage.warning('请填写完整的考生信息');
    return;
  }

  // 检查是否已存在同名考生
  const existingStudent = students.value.find(s => s.name === newStudentForm.name);
  if (existingStudent) {
    ElMessage.warning('该考生已存在，请使用导入功能更新信息');
    return;
  }

  // 添加新考生
  const newStudent: Student = {
    name: newStudentForm.name,
    department: newStudentForm.department,
    group: newStudentForm.group, // 添加班组信息
    examiner1: '',
    examiner2: '',
    examQuestion: ''
  };

  students.value.push(newStudent);
  saveStudentsToStorage();
  syncToSchedulePage();
  
  ElMessage.success(`成功添加考生：${newStudentForm.name}`);
  showAddStudentDialog.value = false;
  
  // 自动选中新添加的考生
  selectStudent(newStudentForm.name);
};

const saveCurrentStudent = () => {
  if (currentStudent.value) {
    currentStudent.value.department = form.studentDept;
    currentStudent.value.examiner1 = result1.value;
    currentStudent.value.examiner2 = result2.value;
  }
};

// Excel导入/导出
const handleFileChange = async (file: any) => {
  fileList.value = [file];
  await parseImportFile(file.raw);
};

// 解析导入文件
const parseImportFile = async (file: File) => {
  try {
    importing.value = true;
    parsedImportData.value = [];
    importValidation.hasErrors = false;
    importValidation.errors = [];
    importValidation.warnings = [];

    const isCSV = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCSV && !isExcel) {
      ElMessage.error('不支持的文件格式，请上传 .xlsx, .xls 或 .csv 文件');
      return;
    }

    let data: ImportStudentData[] = [];

    if (isCSV) {
      data = await parseCSVFile(file);
    } else {
      data = await parseExcelFile(file);
    }

    // 验证数据
    validateImportData(data);
    parsedImportData.value = data;

    
  } catch (err: any) {
    console.error('解析文件失败:', err);
    ElMessage.error(err.message || '解析文件失败');
    parsedImportData.value = [];
  } finally {
    importing.value = false;
  }
};

// 解析CSV文件
const parseCSVFile = async (file: File): Promise<ImportStudentData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('文件内容不足，至少需要标题行和一行数据'));
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data: ImportStudentData[] = [];

        // 查找列索引
        const nameIndex = findColumnIndex(headers, ['姓名', '名字', '考生姓名', 'name']);
        const deptIndex = findColumnIndex(headers, ['科室', '部门', '所在科室', 'department']);
        const groupIndex = findColumnIndex(headers, ['所在班组', '班组', '组别', 'group']);
        const examiner1Index = findColumnIndex(headers, ['考官一', '考官1', 'examiner1', '第一考官']);
        const examiner2Index = findColumnIndex(headers, ['考官二', '考官2', 'examiner2', '第二考官']);
        const examQuestionIndex = findColumnIndex(headers, ['考题', '考试题目', 'examQuestion', '题目']);

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          
          console.log(`[parseCSVFile] 解析第 ${i + 1} 行:`, {
            rawValues: values,
            nameIndex,
            deptIndex,
            groupIndex,
            nameValue: nameIndex >= 0 ? values[nameIndex] : undefined,
            deptValue: deptIndex >= 0 ? values[deptIndex] : undefined,
            groupValue: groupIndex >= 0 ? values[groupIndex] : undefined,
          });
          
          const student: ImportStudentData = {
            name: nameIndex >= 0 ? (values[nameIndex] || '').trim() : '',
            department: deptIndex >= 0 ? (values[deptIndex] || '').trim() : '',
            group: groupIndex >= 0 ? (values[groupIndex] || '').trim() : '',
            examiner1: examiner1Index >= 0 ? (values[examiner1Index] || '').trim() : undefined,
            examiner2: examiner2Index >= 0 ? (values[examiner2Index] || '').trim() : undefined,
            examQuestion: examQuestionIndex >= 0 ? (values[examQuestionIndex] || '').trim() : undefined,
            _valid: {
              name: false,
              department: false,
              group: false,
              all: false
            }
          };

          console.log(`[parseCSVFile] 第 ${i + 1} 行解析后的考生:`, {
            name: student.name,
            department: student.department,
            group: student.group,
            groupType: typeof student.group,
            groupLength: student.group.length,
          });

          // 验证必填字段
          student._valid.name = !!student.name;
          student._valid.department = !!student.department;
          student._valid.group = !!student.group;
          student._valid.all = student._valid.name && student._valid.department && student._valid.group;

          if (student._valid.all || student.name || student.department) {
            data.push(student);
          }
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
};

// 解析Excel文件
const parseExcelFile = async (file: File): Promise<ImportStudentData[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const fileData = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(fileData, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            reject(new Error('Excel文件内容不足，至少需要标题行和一行数据'));
            return;
          }

          const headers = (jsonData[0] || []).map(h => String(h || '').trim());
          const studentData: ImportStudentData[] = [];

          // 查找列索引
          const nameIndex = findColumnIndex(headers, ['姓名', '名字', '考生姓名', 'name']);
          const deptIndex = findColumnIndex(headers, ['科室', '部门', '所在科室', 'department']);
          const groupIndex = findColumnIndex(headers, ['所在班组', '班组', '组别', 'group']);
          const examiner1Index = findColumnIndex(headers, ['考官一', '考官1', 'examiner1', '第一考官']);
          const examiner2Index = findColumnIndex(headers, ['考官二', '考官2', 'examiner2', '第二考官']);
          const examQuestionIndex = findColumnIndex(headers, ['考题', '考试题目', 'examQuestion', '题目']);

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] || [];
            
            console.log(`[parseExcelFile] 解析第 ${i + 1} 行:`, {
              rawRow: row,
              nameIndex,
              deptIndex,
              groupIndex,
              nameValue: nameIndex >= 0 ? row[nameIndex] : undefined,
              deptValue: deptIndex >= 0 ? row[deptIndex] : undefined,
              groupValue: groupIndex >= 0 ? row[groupIndex] : undefined,
            });
            
            const student: ImportStudentData = {
              name: nameIndex >= 0 ? String(row[nameIndex] || '').trim() : '',
              department: deptIndex >= 0 ? String(row[deptIndex] || '').trim() : '',
              group: groupIndex >= 0 ? String(row[groupIndex] || '').trim() : '',
              examiner1: examiner1Index >= 0 ? String(row[examiner1Index] || '').trim() : undefined,
              examiner2: examiner2Index >= 0 ? String(row[examiner2Index] || '').trim() : undefined,
              examQuestion: examQuestionIndex >= 0 ? String(row[examQuestionIndex] || '').trim() : undefined,
              _valid: {
                name: false,
                department: false,
                group: false,
                all: false
              }
            };

            console.log(`[parseExcelFile] 第 ${i + 1} 行解析后的考生:`, {
              name: student.name,
              department: student.department,
              group: student.group,
              groupType: typeof student.group,
              groupLength: student.group.length,
            });

            // 验证必填字段
          student._valid.name = !!student.name;
          student._valid.department = !!student.department;
          student._valid.group = !!student.group;
          student._valid.all = student._valid.name && student._valid.department && student._valid.group;

            if (student._valid.all || student.name || student.department) {
              studentData.push(student);
            }
          }

          resolve(studentData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(error);
    }
  });
};

// 查找列索引
const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => 
      h && (h.includes(name) || name.includes(h) || h.toLowerCase() === name.toLowerCase())
    );
    if (index >= 0) return index;
  }
  return -1;
};

// 验证导入数据
const validateImportData = (data: ImportStudentData[]) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  data.forEach((student, index) => {
    const rowNum = index + 2; // 第1行是标题，数据从第2行开始
    
    if (!student._valid.name) {
      errors.push(`第${rowNum}行：姓名为空`);
    }
    if (!student._valid.department) {
      errors.push(`第${rowNum}行：科室为空`);
    }
    
    // 班组信息必须存在，否则报错
    if (!student._valid.group) {
      errors.push(`第${rowNum}行：所在班组为空，请补充班组信息`);
    }

    // 检查班组是否在预设班组列表中
    if (student.group && groupList.value.length > 0) {
      const groupExists = groupList.value.some(g => g === student.group);
      if (!groupExists) {
        warnings.push(`第${rowNum}行：考生"${student.name}"的班组"${student.group}"不在预设班组列表中，将使用该值`);
      }
    }

    // 检查科室是否存在于科室列表中
    if (student.department && departmentList.value.length > 0) {
      const deptExists = departmentList.value.some(d => d.name === student.department);
      if (!deptExists) {
        warnings.push(`第${rowNum}行：科室"${student.department}"不在系统科室列表中，导入时将自动添加`);
      }
    }

    // 检查是否有重复的考生姓名
    const duplicateCount = data.filter((s, i) => s.name === student.name && i !== index).length;
    if (duplicateCount > 0) {
      warnings.push(`第${rowNum}行：考生"${student.name}"在导入数据中出现${duplicateCount}次，可能导致数据覆盖`);
    }
  });

  importValidation.hasErrors = errors.length > 0;
  importValidation.errors = errors;
  importValidation.warnings = warnings;
};

// 获取验证样式类
const getValidationClass = (field: string) => {
  return parsedImportData.value.some(row => !row._valid[field as keyof typeof row._valid]) 
    ? 'validation-error-column' 
    : '';
};

// 有效数据数量
const validImportDataCount = computed(() => {
  return parsedImportData.value.filter(d => d._valid.all).length;
});

// 重置导入
const resetImport = () => {
  parsedImportData.value = [];
  fileList.value = [];
  importValidation.hasErrors = false;
  importValidation.errors = [];
  importValidation.warnings = [];
  editingCell.row = -1;
  editingCell.field = '';
};

// 确认导入
const confirmImport = async () => {
  const validData = parsedImportData.value.filter(d => d._valid.all);
  
  if (validData.length === 0) {
    ElMessage.warning('没有有效的数据可以导入');
    return;
  }

  // 检查是否有重复的考生姓名
  const duplicateNames = validData.filter(d => 
    students.value.some(s => s.name === d.name)
  );

  // 如果有重复数据或已有数据，显示选择对话框
  let importMode: 'replace' | 'backup' | 'merge' = 'merge';
  
  if (duplicateNames.length > 0 || students.value.length > 0) {
    try {
      // 第一步：选择导入方式
      const choiceResult = await ElMessageBox.confirm(
        `检测到系统中已有 ${students.value.length} 条考生数据，导入数据中有 ${duplicateNames.length} 条与现有数据重复。\n\n请选择导入方式：`,
        '导入方式选择',
        {
          confirmButtonText: '直接删除已有信息',
          cancelButtonText: '先存储信息，再覆盖',
          distinguishCancelAndClose: true,
          type: 'warning',
          showClose: true,
          closeOnClickModal: false
        }
      );
      
      if (choiceResult === 'confirm') {
        // 用户选择"直接删除已有信息"
        try {
          await ElMessageBox.confirm(
            `确认删除所有 ${students.value.length} 条现有考生数据，然后导入 ${validData.length} 条新数据？\n\n⚠️ 此操作不可恢复！`,
            '危险操作确认',
            {
              confirmButtonText: '确认删除并导入',
              cancelButtonText: '取消',
              type: 'error',
              distinguishCancelAndClose: true
            }
          );
          importMode = 'replace';
        } catch {
          return; // 用户取消
        }
      } else if (choiceResult === 'cancel') {
        // 用户选择"先存储信息，再覆盖"
        try {
          await ElMessageBox.confirm(
            `将先备份现有 ${students.value.length} 条数据到本地存储，然后导入 ${validData.length} 条新数据覆盖。\n\n备份数据可在需要时恢复。`,
            '备份并覆盖确认',
            {
              confirmButtonText: '确认备份并导入',
              cancelButtonText: '取消',
              type: 'warning',
              distinguishCancelAndClose: true
            }
          );
          importMode = 'backup';
        } catch {
          return; // 用户取消
        }
      } else {
        return; // 用户关闭对话框
      }
    } catch {
      return; // 用户取消或关闭对话框
    }
  }

  // 根据选择的模式处理数据
  if (importMode === 'replace') {
    // 直接删除所有现有数据
    students.value = [];
    saveStudentsToStorage();
    ElMessage.info('已清空所有现有考生数据');
  } else if (importMode === 'backup') {
    // 备份现有数据到localStorage
    const backupKey = `students_backup_${Date.now()}`;
    const backupData = {
      timestamp: new Date().toISOString(),
      count: students.value.length,
      data: JSON.parse(JSON.stringify(students.value))
    };
    localStorage.setItem(backupKey, JSON.stringify(backupData));
    
    // 保存备份列表
    const backupList = JSON.parse(localStorage.getItem(STORAGE_KEY_BACKUP) || '[]');
    backupList.push({
      key: backupKey,
      timestamp: backupData.timestamp,
      count: backupData.count
    });
    localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(backupList));
    
    ElMessage.success(`已备份 ${students.value.length} 条数据，备份ID: ${backupKey.substring(backupKey.length - 8)}`);
    
    // 清空现有数据
    students.value = [];
    saveStudentsToStorage();
  }

  // 转换为考生格式（保留班组信息）
  const newStudents = validData.map((d) => {
    console.log('[confirmImport] 转换考生数据:', {
      name: d.name,
      originalGroup: d.group,
      groupType: typeof d.group,
      groupLength: d.group ? d.group.length : 0,
      willUseGroup: d.group
    });
    
    const student = {
      name: d.name,
      department: d.department,
      group: d.group, // 直接使用原始的group值，不做任何转换
      examiner1: d.examiner1 && d.examiner1.trim() ? d.examiner1.trim() : '',
      examiner2: d.examiner2 && d.examiner2.trim() ? d.examiner2.trim() : '',
      examQuestion: d.examQuestion && d.examQuestion.trim() ? d.examQuestion.trim() : ''
    };
    
    console.log('[confirmImport] 转换后的考生对象:', {
      name: student.name,
      group: student.group,
      groupType: typeof student.group
    });
    
    return student;
  });

  console.log('[confirmImport] 转换后的考生列表:', newStudents);
  console.log('[confirmImport] 第一个考生:', newStudents[0]);
  console.log('[confirmImport] 第一个考生的group:', newStudents[0].group);
  console.log('[confirmImport] 第一个考生的group类型:', typeof newStudents[0].group);

  // 根据导入模式处理数据
  if (importMode === 'replace' || importMode === 'backup') {
    // 直接替换：添加所有新数据
    newStudents.forEach(newStudent => {
      students.value.push(newStudent);
    });
    console.log('[confirmImport] 添加考生后，students.value数量:', students.value.length);
    console.log('[confirmImport] 第一个考生:', students.value[0]);
    console.log('[confirmImport] 第一个考生的group:', students.value[0].group);
    console.log('[confirmImport] 第一个考生的group类型:', typeof students.value[0].group);
      } else {
        // 合并模式：更新已存在的，添加新的
        newStudents.forEach(newStudent => {
          const existing = students.value.find(s => s.name === newStudent.name);
          if (existing) {
            // 更新现有考生（包括班组信息）
            existing.department = newStudent.department;
            existing.group = newStudent.group; // 更新班组信息
            existing.examiner1 = newStudent.examiner1;
            existing.examiner2 = newStudent.examiner2;
            existing.examQuestion = newStudent.examQuestion;
          } else {
            // 添加新考生
            students.value.push(newStudent);
          }
        });
        console.log('[confirmImport] 合并模式后，students.value数量:', students.value.length);
        console.log('[confirmImport] 第一个考生:', students.value[0]);
        console.log('[confirmImport] 第一个考生的group:', students.value[0].group);
        console.log('[confirmImport] 第一个考生的group类型:', typeof students.value[0].group);
      }

  saveStudentsToStorage();
  syncToSchedulePage();
  
  const modeText = importMode === 'replace' ? '（已清空旧数据）' : 
                   importMode === 'backup' ? '（已备份旧数据）' : '';
  ElMessage.success(`成功导入 ${validData.length} 条考生数据${modeText}`);
  showImportDialog.value = false;
  resetImport();
};

// 开始编辑单元格
const startEditing = (rowIndex: number, field: string) => {
  editingCell.row = rowIndex;
  editingCell.field = field;
  
  nextTick(() => {
    if (field === 'name' && nameInputRef.value) {
      nameInputRef.value.focus();
    }
  });
};

// 完成编辑单元格
const finishEditing = (rowIndex: number, field: string) => {
  const student = parsedImportData.value[rowIndex];
  if (!student) return;
  
  // 重新验证当前行
  student._valid.name = !!student.name;
  student._valid.department = !!student.department;
  student._valid.group = !!student.group;
  student._valid.all = student._valid.name && student._valid.department && student._valid.group;
  
  // 重新验证所有数据
  validateImportData(parsedImportData.value);
  
  // 退出编辑模式
  editingCell.row = -1;
  editingCell.field = '';
};

// 删除导入行
const removeImportRow = (rowIndex: number) => {
  parsedImportData.value.splice(rowIndex, 1);
  
  // 重新验证所有数据
  validateImportData(parsedImportData.value);
  
  // 如果删除的是正在编辑的行，退出编辑模式
  if (editingCell.row === rowIndex) {
    editingCell.row = -1;
    editingCell.field = '';
  } else if (editingCell.row > rowIndex) {
    // 如果删除的行在编辑行之前，调整编辑行索引
    editingCell.row--;
  }
};

// 生成示例文档
const generateTemplateFile = async () => {
  
  
  try {
    // 使用ExcelJS创建工作簿
    const workbook = new ExcelJS.Workbook();
    
    
    const worksheet = workbook.addWorksheet('考生信息');
    
    // 定义表头
    const headers = ['姓名', '科室', '所在班组', '考官一', '考官二', '考题'];
    
    // 设置表头行
    const headerRow = worksheet.addRow(headers);
    
    // 设置表头样式：加粗、字号加大
    headerRow.font = { 
      bold: true, 
      size: 14 
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' } // 浅灰色背景
    };
    headerRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    };
    
    // 设置列宽
    worksheet.getColumn(1).width = 12; // 姓名
    worksheet.getColumn(2).width = 12; // 科室
    worksheet.getColumn(3).width = 15; // 所在班组
    worksheet.getColumn(4).width = 12; // 考官一
    worksheet.getColumn(5).width = 12; // 考官二
    worksheet.getColumn(6).width = 10; // 考题
    
    // 添加示例数据
    const templateData = [
      ['张三', '一室', '第一组', '', '', ''],
      ['李四', '二室', '第二组', '', '', ''],
      ['王五', '三室', '第三组', '', '', '']
    ];
    
    templateData.forEach(row => {
      const dataRow = worksheet.addRow(row);
      dataRow.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      };
    });
    
    // 设置数据验证（下拉列表）- 暂时移除，避免ExcelJS兼容性问题
    // 注意：ExcelJS的数据验证在某些版本中可能有兼容性问题
    // 如果需要数据验证，可以考虑在Excel文件中手动设置，或使用其他方式
    // 科室下拉列表
    // const deptOptions = departmentList.value.map(d => d.name);
    // for (let rowNum = 2; rowNum <= worksheet.rowCount + 1; rowNum++) {
    //   const cell = worksheet.getCell(rowNum, 2);
    //   try {
    //     cell.dataValidation = {
    //       type: 'list',
    //       allowBlank: true,
    //       formulae: [deptOptions.join(',')]
    //     };
    //   } catch (err) {
    //     console.warn('设置科室数据验证失败:', err);
    //   }
    // }
    
    // 所在班组下拉列表
    // const groupOptions = groupList.value;
    // for (let rowNum = 2; rowNum <= worksheet.rowCount + 1; rowNum++) {
    //   const cell = worksheet.getCell(rowNum, 3);
    //   try {
    //     cell.dataValidation = {
    //       type: 'list',
    //       allowBlank: true,
    //       formulae: [groupOptions.join(',')]
    //     };
    //   } catch (err) {
    //     console.warn('设置班组数据验证失败:', err);
    //   }
    // }
    
    // 生成Excel文件
    
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    
    
    // 创建Blob并下载
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `考生信息导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    
    
    
    ElMessage.success('示例文档已生成，请下载后填写考生信息');
  } catch (err: any) {
    
    console.error('生成示例文档失败:', err);
    ElMessage.error(err.message || '生成示例文档失败');
  }
};

const exportResults = async () => {
  if (students.value.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }

  try {
    // 使用ExcelJS创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('考官分配结果');
    
    // 定义表头
    const headers = ['姓名', '科室', '班组', '考官一', '考官二', '考题'];
    
    // 设置表头行
    const headerRow = worksheet.addRow(headers);
    
    // 设置表头样式：加粗、字号加大
    headerRow.font = { 
      bold: true, 
      size: 14 
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' } // 浅灰色背景
    };
    headerRow.alignment = { 
      vertical: 'middle', 
      horizontal: 'center' 
    };
    
    // 添加数据行
    students.value.forEach(student => {
      const row = worksheet.addRow([
        student.name,
        getDeptNameForExport(student.department),
        student.group || '',
        getDeptNameForExport(student.examiner1 || ''),
        getDeptNameForExport(student.examiner2 || ''),
        student.examQuestion || ''
      ]);
      row.alignment = { 
        vertical: 'middle', 
        horizontal: 'center' 
      };
    });
    
    // 设置列宽
    worksheet.getColumn(1).width = 15; // 姓名
    worksheet.getColumn(2).width = 12; // 科室
    worksheet.getColumn(3).width = 12; // 班组
    worksheet.getColumn(4).width = 12; // 考官一
    worksheet.getColumn(5).width = 12; // 考官二
    worksheet.getColumn(6).width = 10; // 考题
    
    // 生成Excel文件
    const buffer = await workbook.xlsx.writeBuffer();
    
    // 创建Blob并下载
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `考官分配结果_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    
    ElMessage.success('导出成功');
  } catch (err: any) {
    console.error('导出失败:', err);
    ElMessage.error(err.message || '导出失败');
  }
};

// 考题选项列表（计算属性）- 转盘显示1-9，但实际分配时只从配置的考题中选择
const examQuestionOptions = computed(() => {
  // 转盘显示时使用1-9，让滚动效果更像赌场
  return ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
});

// 实际可选的考题列表（根据配置）
const actualExamQuestionOptions = computed(() => {
  const examOptionsAll = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const count = Math.max(1, Math.min(examQuestionCount.value || 2, examOptionsAll.length));
  return examOptionsAll.slice(0, count);
});

// 考题罗盘完成回调


// 跑马灯相关状态
const isExamQuestionSpinning = ref(false);
const examQuestionMarqueeOffset = ref(0);
const examQuestionMarqueeCurrentIndex = ref(0);
const examQuestionMarqueeOptions = ref<string[]>([]);
const examQuestionMarqueeInterval = ref<number | null>(null);

// 考题分配（带跑马灯效果）
const assignExamQuestion = async () => {
  if (!result1.value) {
    ElMessage.warning('请先分配第一考官');
    return;
  }
  
  if (!currentStudent.value) {
    ElMessage.warning('请先选择考生');
    return;
  }
  
  loading.value = true;
  isExamQuestionSpinning.value = true;
  
  try {
    // 准备跑马灯选项（使用实际可选的考题）
    const examOptions = actualExamQuestionOptions.value;
    examQuestionMarqueeOptions.value = [...examOptions, ...examOptions, ...examOptions]; // 重复3次以形成循环效果
    examQuestionMarqueeCurrentIndex.value = 0;
    examQuestionMarqueeOffset.value = 0;
    
    // 智能均衡分配：找出分配数量最少的考题
    const examCounts = examOptions.map(eq => ({
      exam: eq,
      count: students.value.filter(s => s.examQuestion === eq).length
    }));
    const minCount = Math.min(...examCounts.map(e => e.count));
    const leastAssigned = examCounts.filter(e => e.count === minCount);
    const selectedExam = leastAssigned[Math.floor(Math.random() * leastAssigned.length)].exam;
    
    // 找到目标考题在原始选项中的索引
    const selectedExamIndex = examOptions.indexOf(selectedExam);
    if (selectedExamIndex === -1) {
      throw new Error('无法找到选中的考题');
    }
    
    // 跑马灯动画参数
    const itemHeight = 32; // 每个选项的高度
    const spinDuration = 1200; // 总动画时长（毫秒）- 加快速度
    const spinSteps = 60; // 动画步数
    const stepDuration = spinDuration / spinSteps;
    
    // 计算最终偏移量
    // 目标：让动画停止时，中间显示的选项正好是 selectedExam
    // 跑马灯数组是重复3次的，我们选择中间部分（第2个循环）的 selectedExam
    const targetIndexInMarquee = examOptions.length + selectedExamIndex; // 中间部分的索引
    // 添加一些随机滚动，让效果更自然（滚动3-5个额外选项）
    const randomExtra = Math.floor(Math.random() * 3) + 3; // 额外滚动3-5个选项
    // 最终位置：目标位置 + 额外滚动（让动画更自然）
    const finalTargetIndex = targetIndexInMarquee + randomExtra;
    // 最终偏移量：让中间位置（16px）正好显示 targetIndexInMarquee 位置的选项
    // 容器高度是32px，中间位置是16px（容器中心）
    // 要让第index个选项完全对齐在中间，偏移量应该是：-(index * itemHeight)
    // 这样第index个选项的顶部会在 -index * itemHeight 位置，选项中心会在 -index * itemHeight + 16 位置
    // 要让选项中心在容器中心（16px），需要：-index * itemHeight + 16 = 16，即 -index * itemHeight = 0
    // 但实际上我们需要让选项的顶部对齐，所以偏移量应该是：-(index * itemHeight)
    const finalOffset = -(targetIndexInMarquee * itemHeight);
    
    // 开始跑马灯动画
    let currentStep = 0;
    const startTime = Date.now();
    
    const animate = () => {
      currentStep++;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      // 使用缓动函数（ease-out）
      const easeOut = 1 - Math.pow(1 - progress, 3);
      examQuestionMarqueeOffset.value = finalOffset * easeOut;
      
      // 更新当前显示的索引（用于高亮）
      // 计算当前偏移量对应的索引（在跑马灯数组中的位置）
      // 由于偏移量是负数，需要取绝对值
      const currentOffset = Math.abs(examQuestionMarqueeOffset.value);
      // 计算当前在中间位置（16px）显示的选项索引
      // 中间位置 = 偏移量 + 16px，对应的索引 = (中间位置) / itemHeight
      const middlePosition = currentOffset + 16;
      const currentIndexInMarquee = Math.round(middlePosition / itemHeight);
      examQuestionMarqueeCurrentIndex.value = currentIndexInMarquee; // 使用跑马灯数组的索引用于高亮
      
      if (progress < 1) {
        examQuestionMarqueeInterval.value = window.setTimeout(animate, stepDuration);
      } else {
        // 动画结束，确保显示正确的考题
        // 最终显示的索引应该是 targetIndexInMarquee（确保是 selectedExam）
        const finalDisplayIndex = targetIndexInMarquee;
        // 强制设置偏移量到精确位置，让中间显示的选项正好是 selectedExam
        // 偏移量计算：-(index * itemHeight)，让第index个选项的顶部在正确位置
        // 这样选项的中心（index * itemHeight + 16）会在容器中心（16px）
        const preciseOffset = -(finalDisplayIndex * itemHeight);
        examQuestionMarqueeOffset.value = preciseOffset;
        // 设置高亮索引为最终位置（在跑马灯数组中的索引）
        examQuestionMarqueeCurrentIndex.value = finalDisplayIndex;
        
        // 等待一小段时间让用户看到最终结果，然后分配考题
        setTimeout(() => {
          isExamQuestionSpinning.value = false;
          if (currentStudent.value) {
            currentStudent.value.examQuestion = selectedExam;
            ElMessage.success(`考题分配成功：考题${selectedExam}`);
            addLog('success', `考题分配成功：考题${selectedExam}`);
            addHistoryRecord(
              currentStudent.value.name,
              '分配考题',
              `考题${selectedExam}`,
              { examiner1: result1.value, examiner2: result2.value }
            );
            saveStudentsToStorage();
            syncToSchedulePage();
          }
          loading.value = false;
        }, 300); // 显示300ms后隐藏跑马灯
      }
    };
    
    animate();
    
  } catch (err: any) {
    isExamQuestionSpinning.value = false;
    ElMessage.error(err.message || '分配考题失败');
    addLog('error', `分配考题失败：${err.message}`);
    loading.value = false;
  }
};

const validateComplete = async () => {
    loading.value = true;
    try {
        const res = await instructorAssignmentService.run({
            action: 'validate_complete',
            student_dept: form.studentDept,
            examiner1: result1.value,
            examiner2: result2.value || undefined
        });
        
        if (res.success && res.data?.valid) {
             ElMessage.success('验证通过：符合所有回避原则');
             message.value = '验证通过：符合所有回避原则';
             isError.value = false;
             addLog('success', '验证通过：符合所有回避原则');
        } else {
             const errors = res.data?.errors?.join(', ') || '验证失败';
             ElMessage.error(errors);
             message.value = errors;
             isError.value = true;
             addLog('error', `验证失败：${errors}`);
        }
    } catch (err: any) {
        ElMessage.error(err.message);
        addLog('error', `验证错误：${err.message}`);
    } finally {
        loading.value = false;
    }
}

// 操作日志管理（优化：使用防抖减少localStorage写入）
let logSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const addLog = (type: OperationLog['type'], message: string) => {
  const log: OperationLog = {
    timestamp: Date.now(),
    type,
    message
  };
  operationLogs.value.unshift(log);
  
  // 限制日志数量（避免内存占用过大）
  if (operationLogs.value.length > 100) {
    operationLogs.value = operationLogs.value.slice(0, 100);
  }
  
  // 使用防抖保存到localStorage（1秒内只保存一次）
  if (logSaveDebounceTimer) {
    clearTimeout(logSaveDebounceTimer);
  }
  logSaveDebounceTimer = setTimeout(() => {
    saveLogsToStorage();
  }, 1000);
};

const clearLogs = () => {
  operationLogs.value = [];
  saveLogsToStorage();
  addLog('info', '操作日志已清空');
};

const getLogClass = (type: OperationLog['type']) => {
  const classes: Record<OperationLog['type'], string> = {
    success: 'log-item-success',
    error: 'log-item-error',
    info: 'log-item-info',
    warning: 'log-item-warning'
  };
  return classes[type] || 'log-item-info';
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// 历史记录管理
// 历史记录保存防抖
let historySaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const addHistoryRecord = (student: string, action: string, result: string, details?: any) => {
  const record: HistoryRecord = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    student,
    action,
    result,
    details
  };
  historyRecords.value.unshift(record);
  
  // 限制历史记录数量（避免内存占用过大，Win7环境优化）
  if (historyRecords.value.length > 200) {
    historyRecords.value = historyRecords.value.slice(0, 200);
  }
  
  // 使用防抖保存（1秒内只保存一次，减少localStorage写入）
  if (historySaveDebounceTimer) {
    clearTimeout(historySaveDebounceTimer);
  }
  historySaveDebounceTimer = setTimeout(() => {
    saveHistoryToStorage();
  }, 1000);
};

const filteredHistory = computed(() => {
  let filtered = historyRecords.value;
  
  // 按类型筛选
  if (historyFilterType.value !== 'all') {
    filtered = filtered.filter(r => {
      const actionMap: Record<string, string[]> = {
        assignment: ['抽取第一考官', '抽取第二考官'],
        exam: ['分配考题'],
        import: ['导入Excel', '导入考生'],
        export: ['导出结果', '导出Excel']
      };
      return actionMap[historyFilterType.value]?.includes(r.action) || false;
    });
  }
  
  // 按搜索文本筛选
  if (historySearchText.value) {
    const search = historySearchText.value.toLowerCase();
    filtered = filtered.filter(r => 
      r.student.toLowerCase().includes(search) ||
      r.action.toLowerCase().includes(search) ||
      r.result.toLowerCase().includes(search)
    );
  }
  
  return filtered;
});

const formatHistoryTime = (row: HistoryRecord) => {
  const date = new Date(row.timestamp);
  return date.toLocaleString('zh-CN');
};

const viewHistoryDetail = (record: HistoryRecord) => {
  ElMessage.info(`查看详情：${record.student} - ${record.action} - ${record.result}`);
};

// 统计信息管理
// 统计刷新（优化：缓存今日日期，避免重复计算，Win7性能优化）
let cachedToday = '';
let cachedTodayAssignments = 0;
const refreshStatistics = () => {
  const today = new Date().toDateString();
  
  statistics.totalStudents = students.value.length;
  statistics.assignedStudents = students.value.filter(s => s.examiner1 || s.examiner2).length;
  
  // 如果日期变化，重新计算今日抽签次数（避免每天重复计算）
  if (cachedToday !== today) {
    cachedToday = today;
    cachedTodayAssignments = historyRecords.value.filter(r => {
      const recordDate = new Date(r.timestamp).toDateString();
      return recordDate === today && (r.action.includes('抽取') || r.action.includes('分配'));
    }).length;
  }
  statistics.todayAssignments = cachedTodayAssignments;
  
  // 计算操作总数（直接从数组长度获取，O(1)复杂度）
  statistics.totalOperations = historyRecords.value.length;
  
  // 操作类型分布（仅在需要时计算，如果历史记录很多可以考虑使用Map缓存）
  const distribution: Record<string, number> = {};
  // 优化：限制遍历数量，避免历史记录过多时性能下降
  const recordsToProcess = historyRecords.value.slice(0, 500); // 最多处理500条
  recordsToProcess.forEach(r => {
    distribution[r.action] = (distribution[r.action] || 0) + 1;
  });
  statistics.actionDistribution = distribution;
};

// 数据持久化
const saveStudentsToStorage = () => {
  try {
    console.log('[saveStudentsToStorage] 开始保存考生数据到localStorage');
    console.log('[saveStudentsToStorage] 考生数量:', students.value.length);
    console.log('[saveStudentsToStorage] 第一个考生:', students.value[0]);
    console.log('[saveStudentsToStorage] 第一个考生的group:', students.value[0]?.group);
    console.log('[saveStudentsToStorage] 第一个考生的group类型:', typeof students.value[0]?.group);
    
    const dataStr = JSON.stringify(students.value);
    console.log('[saveStudentsToStorage] 序列化后的数据长度:', dataStr.length);
    
    localStorage.setItem(STORAGE_KEY_STUDENTS, dataStr);
    
    console.log('[saveStudentsToStorage] 数据已保存到localStorage');
  } catch (err) {
    console.error('保存考生数据失败:', err);
  }
};

const loadStudentsFromStorage = () => {
  try {
    console.log('[loadStudentsFromStorage] 开始从localStorage加载考生数据');
    const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (saved) {
      console.log('[loadStudentsFromStorage] 从localStorage读取到的数据长度:', saved.length);
      students.value = JSON.parse(saved);
      console.log('[loadStudentsFromStorage] 加载的考生数量:', students.value.length);
      console.log('[loadStudentsFromStorage] 第一个考生:', students.value[0]);
      console.log('[loadStudentsFromStorage] 第一个考生的group:', students.value[0]?.group);
      console.log('[loadStudentsFromStorage] 第一个考生的group类型:', typeof students.value[0]?.group);
      
      if (students.value.length > 0 && !selectedStudent.value) {
        selectedStudent.value = students.value[0].name;
        onStudentChange(students.value[0].name);
      }
    } else {
      console.log('[loadStudentsFromStorage] localStorage中没有考生数据');
    }
  } catch (err) {
    console.error('加载考生数据失败:', err);
  }
};

const saveHistoryToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyRecords.value));
  } catch (err) {
    console.error('保存历史记录失败:', err);
  }
};

const loadHistoryFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) {
      historyRecords.value = JSON.parse(saved);
    }
  } catch (err) {
    console.error('加载历史记录失败:', err);
  }
};

const saveLogsToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(operationLogs.value));
  } catch (err) {
    console.error('保存日志失败:', err);
  }
};

const loadLogsFromStorage = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS);
    if (saved) {
      operationLogs.value = JSON.parse(saved);
    }
  } catch (err) {
    console.error('加载日志失败:', err);
  }
};

// 监听考生变化，自动保存（使用防抖优化性能）
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(students, () => {
  // 清除之前的定时器
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  // 使用防抖，避免频繁保存（500ms内只保存一次）
  saveDebounceTimer = setTimeout(() => {
    saveStudentsToStorage();
  }, 500);
  
  // 统计刷新单独防抖（1秒内只刷新一次，减少计算开销）
  if (statsRefreshDebounceTimer) {
    clearTimeout(statsRefreshDebounceTimer);
  }
  statsRefreshDebounceTimer = setTimeout(() => {
    refreshStatistics();
  }, 1000);
}, { deep: true });

// 在关键操作中添加日志和历史记录
const finishAssignment = (type: number, room: string, availableCount: number) => {
  // 🆕 检查是否匹配智能推荐（使用代码比较）
  const roomCode = resolveDeptCode(room);
  const recommendedCode = type === 1 
    ? resolveDeptCode(smartRecommendation.value?.examiner1Dept || '')
    : resolveDeptCode(smartRecommendation.value?.examiner2Dept || '');
  
  const matchesRecommendation = smartRecommendation.value && roomCode && recommendedCode && (
    roomCode === recommendedCode
  );
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:finishAssignment',message:'assignment finished',data:{type,room,matchesRecommendation,recommendedDept:type===1?smartRecommendation.value?.examiner1Dept:smartRecommendation.value?.examiner2Dept,studentName:currentStudent.value?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  if (type === 1) {
    result1.value = room;
    if (currentStudent.value) {
      currentStudent.value.examiner1 = room;
      currentStudent.value.examiner2 = ''; // Clear result 2 if re-assigning 1
      result2.value = '';
    }
    addLog('success', `第一考官分配成功：${room}${matchesRecommendation ? ' ✓ (符合智能推荐)' : ''}`);
    addHistoryRecord(
      currentStudent.value?.name || '未知',
      '抽取第一考官',
      room,
      { availableCount, studentDept: form.studentDept, matchesRecommendation }
    );
  } else {
    result2.value = room;
    if (currentStudent.value) {
      currentStudent.value.examiner2 = room;
    }
    addLog('success', `第二考官分配成功：${room}${matchesRecommendation ? ' ✓ (符合智能推荐)' : ''}`);
    addHistoryRecord(
      currentStudent.value?.name || '未知',
      '抽取第二考官',
      room,
      { availableCount, studentDept: form.studentDept, examiner1: result1.value, matchesRecommendation }
    );
  }
  
  // 🆕 显示更详细的成功消息
  if (matchesRecommendation) {
    message.value = `抽签成功：${room} ✓ 符合智能推荐（高可用性科室）`;
  } else {
  message.value = `抽签成功：从 ${availableCount} 个可用科室中随机选中`;
  }
  
  loading.value = false;
  saveStudentsToStorage();
  // 同步保存到共享存储，供自动排班页面使用
  syncToSchedulePage();
};

// ==================== 🆕 智能预处理功能 ====================

/**
 * 获取参考考试日期范围
 * 使用当前日期后一个月内的工作日作为考试日期参考
 */
const getExamDateRange = (): string[] => {
  const today = new Date();
  const oneMonthLater = new Date(today);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  
  const workdays: string[] = [];
  const current = new Date(today);
  current.setDate(current.getDate() + 1); // 从明天开始
  
  while (current <= oneMonthLater && workdays.length < 10) {
    const dayOfWeek = current.getDay();
    // 排除周末
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = current.toISOString().split('T')[0];
      workdays.push(dateStr);
    }
    current.setDate(current.getDate() + 1);
  }
  
  // 返回前两个工作日作为典型的两天考试日期
  return workdays.slice(0, 2);
};

/**
 * 分析科室可用性（基于班组排班）
 */
const analyzeAvailability = async () => {
  if (isAnalyzingAvailability.value) return;
  
  isAnalyzingAvailability.value = true;
  
  try {
    // 获取考官数据（从本地存储或API）
    // 注意：考官数据保存在 'teachers' 键下
    const teachersData = localStorage.getItem('teachers');
    const teachers = teachersData ? JSON.parse(teachersData) : [];
    
    if (teachers.length === 0) {
      console.warn('⚠️ 未找到考官数据，无法进行智能分析');
      isAnalyzingAvailability.value = false;
      return;
    }
    
    // 获取参考考试日期
    const examDates = getExamDateRange();
    console.log('📅 参考考试日期范围:', examDates);
    
    // 分析科室可用性
    const availability = spinWheelPreprocessService.analyzeDepartmentAvailability(
      teachers.map((t: any) => ({
        name: t.name,
        department: t.department,
        group: t.group || '无'
      })),
      examDates
    );
    
    departmentAvailability.value = availability;
    
    // 生成可用性报告
    const report = spinWheelPreprocessService.generateAvailabilityReport(
      teachers.map((t: any) => ({
        name: t.name,
        department: t.department,
        group: t.group || '无'
      })),
      examDates
    );
    
    console.log('📊 科室可用性分析结果:', report.summary);
    report.recommendations.forEach(r => console.log('✅', r));
    report.warnings.forEach(w => console.warn('⚠️', w));
    
  } catch (error) {
    console.error('❌ 科室可用性分析失败:', error);
  } finally {
    isAnalyzingAvailability.value = false;
  }
};

/**
 * 为当前学员生成智能推荐
 */
const generateRecommendation = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:generateRecommendation',message:'generateRecommendation called',data:{hasCurrentStudent:!!currentStudent.value,studentName:currentStudent.value?.name,studentDept:currentStudent.value?.department},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  if (!currentStudent.value) {
    smartRecommendation.value = null;
    return;
  }
  
  try {
    // 注意：考官数据保存在 'teachers' 键下
    const teachersData = localStorage.getItem('teachers');
    const teachers = teachersData ? JSON.parse(teachersData) : [];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:generateRecommendation:teachersCheck',message:'checking teachers data',data:{teachersCount:teachers.length,hasTeachersData:!!teachersData,sampleTeacher:teachers[0]?{name:teachers[0].name,dept:teachers[0].department,group:teachers[0].group}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    if (teachers.length === 0) {
      smartRecommendation.value = null;
      return;
    }
    
    const examDates = getExamDateRange();
    
    const recommendation = spinWheelPreprocessService.generateSmartRecommendation(
      currentStudent.value.department,
      teachers.map((t: any) => ({
        name: t.name,
        department: t.department,
        group: t.group || '无'
      })),
      examDates
    );
    
    smartRecommendation.value = recommendation;
    
    // 在控制台输出推荐信息
    console.log('🎯 智能推荐结果:');
    console.log(`   考官一推荐科室: ${recommendation.examiner1Dept}室`);
    console.log(`   考官二推荐科室: ${recommendation.examiner2Dept}室`);
    console.log(`   置信度: ${recommendation.confidence}%`);
    recommendation.reasoning.forEach(r => console.log(`   📝 ${r}`));
    recommendation.warnings.forEach(w => console.warn(`   ⚠️ ${w}`));
    
  } catch (error) {
    console.error('❌ 生成智能推荐失败:', error);
    smartRecommendation.value = null;
  }
};

/**
 * 获取科室的推荐等级样式类
 */
const getRecommendationClass = (dept: string): string => {
  const normalizedDept = dept.replace(/室|科/g, '').trim();
  const availability = departmentAvailability.value.get(normalizedDept);
  
  if (!availability) return '';
  
  switch (availability.recommendation) {
    case 'highly_recommended': return 'dept-highly-recommended';
    case 'recommended': return 'dept-recommended';
    case 'acceptable': return 'dept-acceptable';
    case 'not_recommended': return 'dept-not-recommended';
    default: return '';
  }
};

/**
 * 获取科室的推荐提示文字
 */
const getRecommendationTooltip = (dept: string): string => {
  const normalizedDept = dept.replace(/室|科/g, '').trim();
  const availability = departmentAvailability.value.get(normalizedDept);
  
  if (!availability) return '';
  
  const tips: string[] = [
    `可用考官: ${availability.availableExaminers}/${availability.totalExaminers}名`,
    `高优先级: ${availability.highPriorityExaminers}名 (夜班+休息)`,
    `推荐等级: ${getRecommendationText(availability.recommendation)}`
  ];
  
  return tips.join('\n');
};

/**
 * 获取推荐等级文字
 */
const getRecommendationText = (level: string): string => {
  switch (level) {
    case 'highly_recommended': return '强烈推荐 ⭐⭐⭐';
    case 'recommended': return '推荐 ⭐⭐';
    case 'acceptable': return '可接受 ⭐';
    case 'not_recommended': return '不推荐 ❌';
    default: return '未知';
  }
};

/**
 * 获取置信度样式类
 */
const getConfidenceClass = (confidence: number): string => {
  if (confidence >= 70) return 'confidence-high';
  if (confidence >= 50) return 'confidence-medium';
  return 'confidence-low';
};

// 监听当前学员变化，自动生成推荐
watch(() => currentStudent.value, () => {
  generateRecommendation();
}, { immediate: true });

// 页面加载时自动分析可用性
onMounted(() => {
  // 延迟执行，确保考官数据已加载
  setTimeout(() => {
    analyzeAvailability();
  }, 1000);
});

// ==================== 智能预处理功能结束 ====================

// 设置对话框状态
const showDeptCodeDialog = ref(false);
const showInterconnectDialog = ref(false);
const showExamConfigDialog = ref(false);
const showStudentInfoDialog = ref(false);
const showAssignmentSettingsDialog = ref(false);
const showAdminAuthDialog = ref(false);
const showBackupDialog = ref(false);
const showHistoryDialog = ref(false);
const adminPassword = ref('');
const backupList = ref<any[]>([]);

// 科室数据
const departmentList = ref([
  { name: '一室', code: 'A' },
  { name: '二室', code: 'B' },
  { name: '三室', code: 'C' },
  { name: '四室', code: 'D' },
  { name: '五室', code: 'E' },
  { name: '六室', code: 'F' },
  { name: '七室', code: 'G' }
]);

// 班组列表配置（可在设置中管理）
const groupList = ref([
  '第一组',
  '第二组',
  '第三组',
  '第四组'
]);

interface InterconnectGroup {
  codes: string[];
  names: string[];
  display: string;
}

const interconnectGroups = ref<InterconnectGroup[]>([]);
const examQuestionCount = ref(2);

// 设置菜单处理
const handleSettingsCommand = (command: string) => {
  
  
  switch (command) {
    case 'template':
      
      generateTemplateFile();
      break;
    case 'assignment-settings':
      showAssignmentSettingsDialog.value = true;
      break;
    case 'dept-code':
      showDeptCodeDialog.value = true;
      break;
    case 'interconnect':
      showInterconnectDialog.value = true;
      break;
    case 'exam-config':
      showExamConfigDialog.value = true;
      break;
    case 'backup':
      handleBackupCommand();
      break;
    default:
      
      break;
  }
};

// 处理数据备份命令
const handleBackupCommand = () => {
  const savedPassword = localStorage.getItem(STORAGE_KEY_ADMIN_PASSWORD);
  if (!savedPassword) {
    showAdminAuthDialog.value = true;
  } else {
    showBackupDialog.value = true;
    loadBackupList();
  }
};

// 验证管理员密码
const verifyAdminPassword = () => {
  if (!adminPassword.value || adminPassword.value.trim().length === 0) {
    ElMessage.warning('请输入管理员密码');
    return false;
  }
  
  const savedPassword = localStorage.getItem(STORAGE_KEY_ADMIN_PASSWORD);
  if (!savedPassword) {
    localStorage.setItem(STORAGE_KEY_ADMIN_PASSWORD, adminPassword.value.trim());
    ElMessage.success('管理员密码已设置');
    showAdminAuthDialog.value = false;
    showBackupDialog.value = true;
    loadBackupList();
    return true;
  }
  
  if (adminPassword.value.trim() === savedPassword) {
    showAdminAuthDialog.value = false;
    showBackupDialog.value = true;
    loadBackupList();
    return true;
  } else {
    ElMessage.error('密码错误');
    return false;
  }
};

// 创建数据备份
const createBackup = () => {
  const backupData = {
    timestamp: new Date().toISOString(),
    students: students.value,
    history: historyRecords.value,
    settings: {
      departmentList: departmentList.value,
      groupList: groupList.value,
      interconnectGroups: interconnectGroups.value,
      examQuestionCount: examQuestionCount.value
    }
  };
  
  const backupId = `backup_${Date.now()}`;
  const backups = JSON.parse(localStorage.getItem(STORAGE_KEY_BACKUP) || '[]');
  backups.push(backupData);
  
  if (backups.length > 10) {
    backups.shift();
  }
  
  localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(backups));
  loadBackupList();
  ElMessage.success('数据备份已创建');
};

// 加载备份列表
const loadBackupList = () => {
  try {
    const backups = JSON.parse(localStorage.getItem(STORAGE_KEY_BACKUP) || '[]');
    backupList.value = backups.map((b: any, index: number) => ({
      id: index,
      timestamp: new Date(b.timestamp),
      studentCount: b.students?.length || 0,
      data: b
    }));
  } catch (err) {
    console.error('加载备份列表失败:', err);
    backupList.value = [];
  }
};

// 恢复数据备份
const restoreBackup = (backup: any) => {
  ElMessageBox.confirm(
    `确认恢复 ${backup.timestamp.toLocaleString()} 的备份？当前数据将被覆盖。`,
    '恢复备份',
    {
      confirmButtonText: '确认恢复',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    try {
      const data = backup.data;
      students.value = data.students || [];
      historyRecords.value = data.history || [];
      
      if (data.settings) {
        departmentList.value = data.settings.departmentList || departmentList.value;
        groupList.value = data.settings.groupList || groupList.value;
        interconnectGroups.value = data.settings.interconnectGroups || [];
        examQuestionCount.value = data.settings.examQuestionCount || 2;
      }
      
      saveStudentsToStorage();
      saveHistoryToStorage();
      saveSettingsToStorage();
      
      ElMessage.success('数据备份已恢复');
      showBackupDialog.value = false;
    } catch (err) {
      console.error('恢复备份失败:', err);
      ElMessage.error('恢复备份失败');
    }
  }).catch(() => {});
};

// 删除数据备份
const deleteBackup = (index: number) => {
  ElMessageBox.confirm(
    '确认删除此备份？',
    '删除备份',
    {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    try {
      const backups = JSON.parse(localStorage.getItem(STORAGE_KEY_BACKUP) || '[]');
      backups.splice(index, 1);
      localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(backups));
      loadBackupList();
      ElMessage.success('备份已删除');
    } catch (err) {
      console.error('删除备份失败:', err);
      ElMessage.error('删除备份失败');
    }
  }).catch(() => {});
};

// 导出备份文件
const exportBackup = (backup: any) => {
  const backupData = JSON.stringify(backup.data, null, 2);
  const blob = new Blob([backupData], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `backup_${backup.timestamp.getTime()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  ElMessage.success('备份文件已导出');
};

// 从对话框启动抽签
const handleStartSpinFromDialog = async (type: number) => {
  await startSpin(type);
  // 如果抽签成功，更新对话框中的考生信息显示
  await nextTick();
};

// 从对话框分配考题
const handleAssignExamFromDialog = async () => {
  await assignExamQuestion();
  // 如果分配成功，更新对话框中的考生信息显示
  await nextTick();
};

// 保存科室代码配置
const handleSaveDeptCodes = async (departments: any[]) => {
  const oldDepartments = Array.isArray(departmentList.value) ? [...departmentList.value] : [];
  departmentList.value = departments;
  
  // 保存到本地存储
  saveSettingsToStorage();
  
  // 尝试同步到后端
  try {
    const res = await instructorAssignmentService.saveDepartmentCodes(departments);
    if (res.success) {
      ElMessage.success('科室代码配置已保存（已同步到服务器）');
    } else {
      ElMessage.success('科室代码配置已保存（本地）');
    }
  } catch (error) {
    ElMessage.success('科室代码配置已保存（本地）');
  }

  // 科室代码变更后：同步重建互通组 codes（互通设置以 code 为准）
  const nameToNewCode = new Map<string, string>();
  departments.forEach((d: any) => {
    if (d?.name && d?.code) {
      nameToNewCode.set(String(d.name), String(d.code));
    }
  });

  const oldCodeToName = new Map<string, string>();
  oldDepartments.forEach((d: any) => {
    if (d?.code && d?.name) {
      oldCodeToName.set(String(d.code), String(d.name));
    }
  });

  interconnectGroups.value = (interconnectGroups.value || []).map((g: any) => {
    const names: string[] = Array.isArray(g?.names) && g.names.length > 0
      ? g.names.map((n: any) => String(n))
      : (Array.isArray(g?.codes) ? g.codes.map((c: any) => oldCodeToName.get(String(c)) || String(c)) : []);

    const codes: string[] = names.map(n => nameToNewCode.get(n) || String(n));

    return {
      ...g,
      names,
      codes,
      display: Array.isArray(names) ? names.join(' + ') : g?.display,
    };
  });

  // 更新可用科室选项
  availableRoomOptions.value = departments.map((d: any) => d.name);
  form.availableRooms = [...availableRoomOptions.value];
  saveSettingsToStorage();
};

// 保存互通设置
const handleSaveInterconnect = async (groups: any[]) => {
  interconnectGroups.value = groups;
  
  // 保存到本地存储
  saveSettingsToStorage();
  
  // 尝试同步到后端
  try {
    const res = await instructorAssignmentService.saveInterconnectGroups(groups);
    if (res.success) {
      ElMessage.success('科室互通设置已保存（已同步到服务器）');
    } else {
      ElMessage.success('科室互通设置已保存（本地）');
    }
  } catch (error) {
    ElMessage.success('科室互通设置已保存（本地）');
  }
};

// 保存考题配置
const handleSaveExamConfig = async (count: number) => {
  examQuestionCount.value = count;
  
  // 保存到本地存储
  saveSettingsToStorage();
  
  // 尝试同步到后端
  try {
    const res = await instructorAssignmentService.saveExamQuestionCount(count);
    if (res.success) {
      ElMessage.success('考题配置已保存（已同步到服务器）');
    } else {
      ElMessage.success('考题配置已保存（本地）');
    }
  } catch (error) {
    ElMessage.success('考题配置已保存（本地）');
  }
};

// 同步数据到自动排班页面
const syncToSchedulePage = () => {
  try {
    console.log('[syncToSchedulePage] 开始同步数据到自动排班页面');
    console.log('[syncToSchedulePage] 当前考生数量:', students.value.length);
    console.log('[syncToSchedulePage] 第一个考生原始数据:', students.value[0]);
    console.log('[syncToSchedulePage] 第一个考生的group:', students.value[0].group);
    console.log('[syncToSchedulePage] 第一个考生的group类型:', typeof students.value[0].group);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'InstructorAssignmentPage.vue:syncToSchedulePage',message:'syncToSchedulePage called',data:{studentCount:students.value.length,firstStudentData:students.value[0]?{name:students.value[0].name,department:students.value[0].department,group:students.value[0].group,examiner1:students.value[0].examiner1,examiner2:students.value[0].examiner2}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    const assignmentStudents: AssignmentStudent[] = students.value.map(s => {
      console.log(`[syncToSchedulePage] 映射考生 ${s.name}:`, {
        originalGroup: s.group,
        groupType: typeof s.group,
        groupIsNull: s.group === null,
        groupIsUndefined: s.group === undefined,
        groupIsEmpty: s.group === '',
        mappedGroup: s.group
      });
      
      return {
        name: s.name,
        department: getDeptNameForExport(s.department),
        group: s.group, // 直接使用原始的group值，不做任何转换
        examiner1: s.examiner1 ? getDeptNameForExport(s.examiner1) : undefined,
        examiner2: s.examiner2 ? getDeptNameForExport(s.examiner2) : undefined,
        examQuestion: s.examQuestion,
      };
    });
    
    console.log('[syncToSchedulePage] 映射后第一个考生:', assignmentStudents[0]);
    console.log('[syncToSchedulePage] 映射后第一个考生的group:', assignmentStudents[0].group);
    console.log('[syncToSchedulePage] 映射后第一个考生的group类型:', typeof assignmentStudents[0].group);
    
    assignmentDataService.saveAssignmentData(assignmentStudents);
    
    console.log('[syncToSchedulePage] 数据同步完成');
  } catch (err: any) {
    console.error('同步数据到自动排班页面失败:', err);
  }
};

// 考生信息管理相关状态
const studentInfoSearchText = ref('');
const studentInfoFilterDept = ref('');
const studentInfoFilterStatus = ref('');
const showStudentDetailDialog = ref(false);
const currentDetailStudent = ref<Student | null>(null);

// 考生信息过滤
const filteredStudentInfo = computed(() => {
  return students.value.filter(student => {
    const matchName = !studentInfoSearchText.value || 
      student.name.toLowerCase().includes(studentInfoSearchText.value.toLowerCase());
    const matchDept = !studentInfoFilterDept.value || 
      student.department === studentInfoFilterDept.value;
    const matchStatus = !studentInfoFilterStatus.value || 
      getStudentInfoStatusType(student) === studentInfoFilterStatus.value;
    return matchName && matchDept && matchStatus;
  });
});

// 获取考生信息状态类型
const getStudentInfoStatusType = (student: Student): string => {
  const hasExaminer1 = !!student.examiner1;
  const hasExaminer2 = !!student.examiner2;
  const hasExamQuestion = !!student.examQuestion;
  
  if (hasExaminer1 && hasExaminer2 && hasExamQuestion) {
    return 'completed';
  } else if (hasExaminer1 || hasExaminer2 || hasExamQuestion) {
    return 'partial';
  } else {
    return 'pending';
  }
};

// 获取考生信息状态文本
const getStudentInfoStatusText = (student: Student): string => {
  const statusType = getStudentInfoStatusType(student);
  switch (statusType) {
    case 'completed':
      return '已完成';
    case 'partial':
      return '进行中';
    case 'pending':
      return '待处理';
    default:
      return '未知';
  }
};

// 获取完成进度百分比
const getCompletionPercentage = (student: Student): number => {
  let completed = 0;
  if (student.examiner1) completed++;
  if (student.examiner2) completed++;
  if (student.examQuestion) completed++;
  return Math.round((completed / 3) * 100);
};

// 查看考生详情
const viewStudentDetail = (student: Student) => {
  currentDetailStudent.value = student;
  showStudentDetailDialog.value = true;
};

// 导出考生信息
const exportStudentInfo = () => {
  if (filteredStudentInfo.value.length === 0) {
    ElMessage.warning('没有可导出的数据');
    return;
  }
  
  const headers = ['姓名', '科室', '班组', '考官一', '考官二', '考题', '状态'];
  const rows = filteredStudentInfo.value.map(s => [
    s.name,
    getDeptNameForExport(s.department),
    s.group || '-',
    s.examiner1 ? getDeptNameForExport(s.examiner1) : '-',
    s.examiner2 ? getDeptNameForExport(s.examiner2) : '-',
    s.examQuestion || '-',
    getStudentInfoStatusText(s)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `考生信息_${new Date().toLocaleDateString()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  
  ElMessage.success(`已导出 ${filteredStudentInfo.value.length} 条考生信息`);
};

// 导出到自动排班页面
const exportToSchedulePage = () => {
  if (students.value.length === 0) {
    ElMessage.warning('没有可导出的考生数据');
    return;
  }
  
  syncToSchedulePage();
  ElMessage.success({
    message: `已导出 ${students.value.length} 位考生数据到自动排班页面，可在自动排班页面点击"从考官分配导入"使用`,
    duration: 5000,
  });
};


</script>

<style>
/* CSS变量定义 */
:root {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 80px;
}

/* 确保样式优先级最高，覆盖全局样式 */
#instructor-assignment-page .sidebar {
  background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 100%) !important;
  color: white !important;
}

#instructor-assignment-page .sidebar * {
  color: inherit;
}

#instructor-assignment-page .nav-item {
  color: rgba(255, 255, 255, 0.8) !important;
}

#instructor-assignment-page .nav-item:hover {
  color: white !important;
}

#instructor-assignment-page .nav-item-active {
  color: white !important;
}
</style>

<style scoped>
/* 主容器 */
.app-container {
  display: flex;
  width: 100%;
  max-width: 100vw;
  height: 100%;
  min-height: 100vh;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
}

/* 侧边栏样式 */
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.sidebar::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: #3b82f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-text {
  flex: 1;
}

.system-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
}

.system-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 导航样式 */
.sidebar-nav {
  flex: 1;
  padding: 20px 0;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 20px;
}

.sidebar-collapsed .nav-items {
  padding: 0 10px;
}

.sidebar-collapsed .nav-item {
  justify-content: center;
  padding: 12px;
}

.nav-item {
  display: flex !important;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8) !important;
  text-decoration: none;
  transition: all 0.2s ease;
  visibility: visible !important;
  opacity: 1 !important;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
}

.nav-item-active {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
}

.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

/* 侧边栏底部 - 版本信息 */
.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: auto;
}

.version-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.version-info:hover {
  background: rgba(255, 255, 255, 0.12);
}

.version-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.version-number {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 侧边栏收缩按钮 */
/* 侧边栏切换按钮 - 使用更具体的选择器确保样式应用 */
#instructor-assignment-page .sidebar .sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 2147483647 !important;
  pointer-events: auto;
}

#instructor-assignment-page .sidebar .sidebar-toggle:hover {
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

#instructor-assignment-page .sidebar .toggle-icon {
  width: 16px;
  height: 16px;
  color: #374151 !important;
  transition: transform 0.3s ease;
}

#instructor-assignment-page .sidebar .toggle-icon.rotated {
  transform: rotate(180deg);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  height: 100%;
  background: #f5f7fa;
  padding: 32px;
  overflow-y: auto;
}

/* 页面标题区 */
.page-header {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}


.dashboard-page {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  flex-direction: column;
  width: 100% !important;
  min-width: 0;
  padding: 0; /* 移除额外padding，使用main-content的padding */
  gap: 1.5rem;
  box-sizing: border-box;
}

/* 操作日志样式 */
.log-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f9fafb;
}

.log-item {
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  border-left: 3px solid #e5e7eb;
  background: white;
}

.log-item-success {
  border-left-color: #10b981;
  background: #f0fdf4;
}

.log-item-error {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.log-item-info {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.log-item-warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

/* 导入预览样式 */
.preview-table-container {
  max-height: 400px;
  overflow-y: auto;
}

.text-error {
  color: #f56c6c;
  font-weight: 500;
}

.validation-error-column {
  background-color: #fef0f0;
}

.error-list {
  margin: 8px 0;
  padding-left: 20px;
}

.error-list li {
  margin: 4px 0;
  color: #f56c6c;
}

.warning-list {
  margin: 8px 0;
  padding-left: 20px;
}

.warning-list li {
  margin: 4px 0;
  color: #e6a23c;
}

.editable-cell {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.editable-cell:hover {
  background-color: #f5f7fa;
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
  color: #909399;
}

.editable-cell:hover .edit-icon {
  opacity: 1;
}

.input-error {
  border-color: #f56c6c !important;
}

.log-time {
  color: #6b7280;
  font-size: 12px;
  margin-right: 8px;
  white-space: nowrap;
}

.log-message {
  color: #1f2937;
  flex: 1;
}

/* 统计信息样式 */
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

/* 历史记录样式 */
.history-container {
  padding: 16px;
}

/* 考生信息显示样式 */
.info-field {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 6px;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-height: 75px;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
}

.info-field-vertical {
  min-height: 56px;
  padding: 12px 16px;
  flex-direction: row;
  align-items: center;
  text-align: left;
  justify-content: space-between;
  width: 100%;
  flex-shrink: 0;
}

.info-field-vertical > div {
  width: 100%;
  display: flex;
  align-items: center;
}

.info-field:hover {
  background: #f0f2f5;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.info-field-filled {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: #bae6fd;
}

.info-field-empty {
  opacity: 0.7;
}

.info-label {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.2;
  letter-spacing: 0.3px;
  white-space: nowrap;
  min-width: 70px;
}

.info-field-vertical .info-label {
  margin-bottom: 0;
  margin-right: 16px;
  flex-shrink: 0;
  font-size: 14px;
}

.info-value {
  font-size: 15px;
  font-weight: 700;
  min-height: 22px;
  line-height: 1.5;
  word-break: break-all;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-field-vertical .info-value {
  text-align: right;
  word-break: break-word;
  overflow-wrap: break-word;
  flex: 1;
  min-width: 0;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  font-size: 16px;
}

/* 各字段颜色 */
.info-label-name,
.info-value-name {
  color: #16a085;
}

.info-label-dept,
.info-value-dept {
  color: #2980b9;
}

.info-label-examiner1,
.info-value-examiner1 {
  color: #27ae60;
}

.info-label-examiner2,
.info-value-examiner2 {
  color: #8e44ad;
}

.info-label-exam,
.info-value-exam {
  color: #e67e22;
}

/* 操作按钮渐变样式 */
.action-btn-gradient {
  border: none;
  color: white;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  letter-spacing: 0.5px;
  height: 48px;
  font-size: 15px;
}

.action-btn-vertical {
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  margin: 0 !important;
  margin-bottom: 0 !important;
}

.action-btn-vertical .el-button__inner {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  width: 100% !important;
}

.action-btn-gradient:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.action-btn-gradient:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.action-btn-primary-gradient {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.action-btn-primary-gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

.action-btn-success-gradient {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.action-btn-success-gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.action-btn-warning-gradient {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.action-btn-warning-gradient:hover:not(:disabled) {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
}

.action-btn-gradient:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 考生列表样式 */
.student-list-container {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.student-item {
  position: relative;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.student-item:hover {
  border-color: #93c5fd;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.student-item-selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.18);
  font-weight: 700;
}

.student-item-pending {
  border-color: #d1d5db;
  background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
}

.student-item-pending:hover {
  border-color: #9ca3af;
  box-shadow: 0 2px 6px rgba(107, 114, 128, 0.18);
}

.student-item-completed {
  border-color: #16a34a;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.student-item-completed:hover {
  border-color: #16a34a;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.2);
}

.student-item-partial {
  border-color: #fbbf24;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.student-item-partial:hover {
  border-color: #f59e0b;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.2);
}

.student-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.student-name {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  color: #1f2937;
}

.name-text {
  color: #1f2937;
}

.student-name-simple {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  font-weight: 500;
  font-size: 14px;
  color: #1f2937;
  text-align: center;
  line-height: 1.4;
}

.student-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8);
}

.status-dot-pending {
  background: #9ca3af;
}

.status-dot-partial {
  background: #f59e0b;
}

.status-dot-completed {
  background: #22c55e;
}

.student-dept {
  font-size: 13px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
}

.student-item-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.detail-label {
  color: #6b7280;
  min-width: 60px;
  font-weight: 500;
}

.detail-value {
  color: #1f2937;
  font-weight: 600;
  flex: 1;
}

.detail-value-empty {
  color: #9ca3af;
  font-weight: 400;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

/* 考生详情对话框样式 */
.student-detail-container {
  padding: 10px 0;
}

.detail-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.detail-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #3b82f6;
  display: inline-block;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

.text-success {
  color: #22c55e;
}

.text-gray-400 {
  color: #9ca3af;
}

.progress-container {
  padding: 10px 0;
}

.progress-labels {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
  font-size: 13px;
  color: #6b7280;
}

.progress-label {
  padding: 4px 12px;
  border-radius: 4px;
  background: #f3f4f6;
  transition: all 0.3s;
}

.progress-label.completed {
  background: #dcfce7;
  color: #166534;
  font-weight: 600;
}

/* 备份对话框样式 */
.backup-actions {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 16px;
}

/* 考题跑马灯样式 */
.exam-question-marquee {
  position: relative;
  height: 32px;
  overflow: hidden;
  border-radius: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 中间指示器 */
.exam-question-indicator {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  z-index: 10;
  pointer-events: none;
  height: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.indicator-line {
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, transparent, #fff, transparent);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}

.indicator-arrow {
  color: #fff;
  font-size: 12px;
  line-height: 1;
  margin-top: 2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  animation: indicatorPulse 1s ease-in-out infinite;
}

@keyframes indicatorPulse {
  0%, 100% {
    opacity: 1;
    transform: translateY(0);
  }
  50% {
    opacity: 0.7;
    transform: translateY(2px);
  }
}

.exam-question-item {
  transition: transform 0.03s linear;
  will-change: transform;
}

.exam-question-option {
  height: 32px;
  line-height: 32px;
  text-align: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.15s;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.exam-question-option.active {
  opacity: 1;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  transform: scale(1.15);
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.exam-question-result {
  color: inherit;
  font-weight: 500;
  transition: all 0.3s;
}

/* ==================== 🆕 智能推荐样式 ==================== */
.smart-recommendation-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #7dd3fc;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.15);
}

.recommendation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #bae6fd;
}

.recommendation-icon {
  font-size: 18px;
}

.recommendation-title {
  font-size: 14px;
  font-weight: 600;
  color: #0369a1;
  flex: 1;
}

.recommendation-confidence {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.confidence-high {
  background: #dcfce7;
  color: #166534;
}

.confidence-medium {
  background: #fef3c7;
  color: #92400e;
}

.confidence-low {
  background: #fee2e2;
  color: #991b1b;
}

.recommendation-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.item-label {
  color: #64748b;
  min-width: 80px;
}

.item-value {
  font-weight: 600;
  color: #1e40af;
}

.item-hint {
  font-size: 11px;
  color: #94a3b8;
}

.dept-tag {
  padding: 2px 10px;
  border-radius: 6px;
  background: #dbeafe;
}

.dept-highly-recommended {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid #86efac;
}

.dept-recommended {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.dept-acceptable {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 1px solid #fcd34d;
}

.dept-not-recommended {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.recommendation-warnings {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #fcd34d;
}

.warning-item {
  font-size: 12px;
  color: #92400e;
  padding: 4px 0;
}
/* ==================== 智能推荐样式结束 ==================== */
</style>
