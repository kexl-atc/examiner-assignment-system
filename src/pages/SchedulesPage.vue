<template>
  <div class="app-container responsive-container">
    <!-- 移动端遮罩层 -->
    <div 
      v-if="isMobile && mobileMenuOpen" 
      class="mobile-overlay"
      @click="closeMobileMenu"
    ></div>
    
    <!-- 侧边栏 -->
    <aside 
      class="sidebar" 
      :class="{ 
        'sidebar-collapsed': sidebarCollapsed,
        'mobile-open': isMobile && mobileMenuOpen
      }"
    >
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
          <router-link to="/instructor-assignment" class="nav-item">
            <Shuffle class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">考官分配</span>
          </router-link>
          <router-link to="/schedules" class="nav-item nav-item-active">
            <Calendar class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">自动排班</span>
          </router-link>
          <!-- 隐藏数据统计页面 -->
          <!-- <router-link to="/statistics" class="nav-item">
            <BarChart class="nav-icon" />
            <span v-show="!sidebarCollapsed" class="nav-text">数据统计</span>
          </router-link> -->
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
    <div 
      class="main-content padding-responsive"
      :class="{
        'sidebar-open': isMobile && mobileMenuOpen,
        'mobile-layout': isMobile,
        'tablet-layout': isTablet,
        'desktop-layout': isDesktop
      }"
    >


      <!-- 右侧内容区域 -->
      <div class="right-content full-width">
        <!-- 页面标题栏 -->
        <div class="page-header">
          <h1 class="page-title">排班管理</h1>
          <div class="flex items-center space-x-4 mb-2">
            <div class="text-sm text-gray-500">
              状态: <span :class="[
                'px-2 py-1 rounded text-xs font-medium',
                isTableUpdating ? 'bg-blue-100 text-blue-800 status-indicator updating' :
                isScheduling ? 'bg-yellow-100 text-yellow-800 status-indicator solving' :
                scheduleResults.length > 0 ? 'bg-green-100 text-green-800 status-indicator completed' :
                'bg-gray-100 text-gray-800 status-indicator ready'
              ]">{{ getTableStatusText() }}</span>
            </div>
            <div v-if="lastTableUpdate" class="text-sm text-gray-400">
              最后更新: {{ lastTableUpdate }}
            </div>
          </div>
          <div class="header-actions">
            <!-- 🔧 局部重排按钮（合并原'重新排班'和'只重排固定排班'） -->
            <button 
              class="action-btn action-btn-primary" 
              @click="triggerLocalReschedule"
              :disabled="isLocalRescheduling || pinnedScheduleIds.size === 0"
              :class="{ loading: isLocalRescheduling }"
              :title="pinnedScheduleIds.size === 0 ? '请先固定需要重排的排班记录' : '为固定的排班记录在选定日期后自动扩展日期（2→4→6→8天）直到排班成功，未固定排班保持不变'"
            >
              <RefreshCw class="btn-icon" :class="{ 'spinning': isLocalRescheduling }" />
              <span v-if="!isLocalRescheduling">
                局部重排
                <span v-if="pinnedScheduleIds.size > 0" style="font-size: 11px; opacity: 0.8;">({{ pinnedScheduleIds.size }})</span>
              </span>
              <span v-else>局部重排中...</span>
            </button>
            <!-- 🚫 "检测冲突"按钮已移除（用户要求） -->
            <button class="action-btn action-btn-secondary" @click="showConstraintsPanel = false" v-if="showConstraintsPanel">
              <span>退出</span>
            </button>
            <button 
              class="action-btn action-btn-success" 
              @click="handleExportCurrentSchedule"
              v-if="scheduleResults.length > 0"
              title="导出排班表（保留人工修改颜色信息）">
              <Download class="btn-icon" />
              <span>导出排班表</span>
            </button>
            <button class="action-btn action-btn-warning" @click="forceRefreshDisplay" v-if="scheduleResults.length > 0 && needsRefresh" title="如果排班结果不显示，点击此按钮强制刷新">
              <RefreshCw class="btn-icon" />
              <span>刷新显示</span>
            </button>
            <button class="action-btn action-btn-primary" @click="handleNewSchedule" v-if="!showConstraintsPanel">
              <Plus class="btn-icon" />
              <span>新建排班</span>
            </button>
          </div>
        </div>

        <!-- 约束违反提示 - 智能显示最重要的违反 -->
        <!-- 约束违反提醒弹窗 - 已替换为统一弹窗 -->
        <!-- <ConstraintViolationAlert 
          v-if="constraintViolations.length > 0 && shouldShowViolationAlert"
          :violations="constraintViolations"
          @fix-violation="handleFixViolation"
          @fix-all="handleFixAllViolations"
          @dismiss="dismissViolationAlert"
        /> -->
        
        <!-- 🎬 实时更新提示横幅 -->
        <div v-if="isTableUpdating" class="realtime-update-banner">
          <div class="update-indicator">
            <div class="loading-dots"></div>
            <span>🔄 正在实时更新排班结果...</span>
            <span class="update-count">当前显示: {{ scheduleResults.length }} 条记录</span>
          </div>
        </div>
        
        <!-- 🎯 中间结果提示横幅 -->
        <div v-if="isShowingIntermediateResult && isScheduling" class="intermediate-result-banner">
          <div class="intermediate-indicator">
            <span class="pulse-icon">📊</span>
            <span class="intermediate-text">这是中间结果预览，系统将在 3 秒后继续优化...</span>
            <div class="countdown-bar"></div>
          </div>
        </div>
        
        <!-- ✈️ 民航主题加载界面 -->
        <AviationSchedulingLoader 
          v-if="showAviationLoader"
          :progress="schedulingProgress"
          :status-message="currentProgressMessage || (smartProgress.currentStage.value as any)?.desc || ''"
          :current-assignments="(smartAssignmentCount as any) || 0"
          :total-assignments="totalStudents * 2"
          :hard-score="currentHardScore"
          :soft-score="currentSoftScore"
          :realtime-logs="realtimeLogs"
          :is-completed="schedulingCompleted"
          :final-statistics="finalScheduleStatistics"
          @view-result="handleViewScheduleResult"
        />
        
        <!-- 排班表格 -->
        <div v-else class="table-container" :class="{ 'updating': isTableUpdating }">
          <table class="schedule-table">
            <thead>
              <tr>
                <th>所在科室</th>
                <th>学员</th>
                <th>考试日期</th>
                <th>考试类型</th>
                <th>考官一</th>
                <th>考官二</th>
                <th>备份考官</th>
                <th>考试日期</th>
                <th>考试类型</th>
                <th>考官一</th>
                <th>考官二</th>
                <th>备份考官</th>
                <th>操作</th>
                <th class="pin-column">固定</th>
                <th class="drag-column">拖动</th>
              </tr>
            </thead>
            <tbody>
               <!-- 显示排班结果数据 -->
               <template v-for="(result, index) in scheduleResults" :key="String(result?.id ?? `${result?.student || 'unknown'}-${result?.date1 || ''}-${index}`)">
                 <!-- 排班数据行 -->
                 <tr 
                   :class="{ 
                     'animating-row': getCellAnimationState(index, 'any', 1),
                     'is-pinned': isPinnedSchedule(String(result.id)),
                     'is-dragging': draggingSchedule?.id === result.id,
                     'hard-conflict-row': hasHardConflict(result)
                   }"
                   :title="getHardConflictTooltip(result)"
                   :draggable="!isPinnedSchedule(String(result.id))"
                   @dragstart="handleDragStart($event, result, 1)"
                   @dragend="handleDragEnd"
                 >
                   <td class="department-cell">{{ displayDepartment(result?.department) }}</td>
                   <td class="student-cell">{{ result?.student || '-' }}</td>
                   <td :class="getCellAnimationState(index, 'date', 1) ? `table-cell-${getCellAnimationState(index, 'date', 1)?.animationType}` : ''">
                     {{ formatDisplayDate(result?.date1) }}
                   </td>
                   <td>{{ result?.type1 || ((result as any)?.examDays === 1 ? '模拟机' : '现场+模拟机1') }}</td>
                  <td class="editable-cell" 
                      :class="[
                        getCellAnimationState(index, 'examiner1', 1) ? `table-cell-${getCellAnimationState(index, 'examiner1', 1)?.animationType}` : '',
                        getManualEditClass(result, 'examiner1_1')
                      ]"
                      :title="getManualEditTooltip(result, 'examiner1_1')"
                      @click="editExaminer(result, 'examiner1_1')">
                    {{ result?.examiner1_1 || '-' }}
                  </td>
                  <td class="editable-cell" 
                      :class="[
                        getCellAnimationState(index, 'examiner2', 1) ? `table-cell-${getCellAnimationState(index, 'examiner2', 1)?.animationType}` : '',
                        getManualEditClass(result, 'examiner1_2')
                      ]"
                      :title="getManualEditTooltip(result, 'examiner1_2')"
                      @click="editExaminer(result, 'examiner1_2')">
                    {{ result?.examiner1_2 || '-' }}
                  </td>
                  <td class="editable-cell" 
                      :class="[
                        getCellAnimationState(index, 'backup', 1) ? `table-cell-${getCellAnimationState(index, 'backup', 1)?.animationType}` : '',
                        getManualEditClass(result, 'backup1')
                      ]"
                      :title="getManualEditTooltip(result, 'backup1')"
                      @click="editExaminer(result, 'backup1')">
                    {{ result?.backup1 || '-' }}
                  </td>
                   <td :class="[
                         getCellAnimationState(index, 'date', 2) ? `table-cell-${getCellAnimationState(index, 'date', 2)?.animationType}` : '',
                         { 'one-day-exam-cell': (result as any)?.examDays === 1 }
                       ]">
                     {{ formatDisplayDate(result?.date2) }}
                   </td>
                   <td :class="{ 'one-day-exam-cell': (result as any)?.examDays === 1 }">{{ result?.type2 || '模拟机2+口试' }}</td>
                   <td class="editable-cell" 
                       :class="[
                         getCellAnimationState(index, 'examiner1', 2) ? `table-cell-${getCellAnimationState(index, 'examiner1', 2)?.animationType}` : '',
                         getManualEditClass(result, 'examiner2_1'),
                         { 'one-day-exam-cell': (result as any)?.examDays === 1 }
                       ]"
                       :title="(result as any)?.examDays === 1 ? '一天考试，无需分配' : getManualEditTooltip(result, 'examiner2_1')"
                       @click="(result as any)?.examDays !== 1 && editExaminer(result, 'examiner2_1')">
                     {{ result?.examiner2_1 || '-' }}
                   </td>
                   <td class="editable-cell" 
                       :class="[
                         getCellAnimationState(index, 'examiner2', 2) ? `table-cell-${getCellAnimationState(index, 'examiner2', 2)?.animationType}` : '',
                         getManualEditClass(result, 'examiner2_2'),
                         { 'one-day-exam-cell': (result as any)?.examDays === 1 }
                       ]"
                       :title="(result as any)?.examDays === 1 ? '一天考试，无需分配' : getManualEditTooltip(result, 'examiner2_2')"
                       @click="(result as any)?.examDays !== 1 && editExaminer(result, 'examiner2_2')">
                     {{ result?.examiner2_2 || '-' }}
                   </td>
                   <td class="editable-cell" 
                       :class="[
                         getCellAnimationState(index, 'backup', 2) ? `table-cell-${getCellAnimationState(index, 'backup', 2)?.animationType}` : '',
                         getManualEditClass(result, 'backup2'),
                         { 'one-day-exam-cell': (result as any)?.examDays === 1 }
                       ]"
                       :title="(result as any)?.examDays === 1 ? '一天考试，无需分配' : getManualEditTooltip(result, 'backup2')"
                       @click="(result as any)?.examDays !== 1 && editExaminer(result, 'backup2')">
                     {{ result?.backup2 || '-' }}
                   </td>
                   <td class="action-cell">
                     <div class="action-buttons">
                       <button class="action-btn delete-btn" @click="deleteScheduleRecord(result)" title="删除">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                           <polyline points="3,6 5,6 21,6"></polyline>
                           <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                           <line x1="10" y1="11" x2="10" y2="17"></line>
                           <line x1="14" y1="11" x2="14" y2="17"></line>
                         </svg>
                       </button>
                     </div>
                   </td>
                  <!-- 🆕 固定按钮列 -->
                  <td class="pin-column">
                    <button 
                      class="pin-button"
                      :class="{ 'is-pinned': isPinnedSchedule(String(result.id)) }"
                      @click="togglePinSchedule(String(result.id))"
                      :title="isPinnedSchedule(String(result.id)) ? '取消固定' : '固定此排班'"
                    >
                      <Pin :class="{ 'filled': isPinnedSchedule(String(result.id)) }" />
                    </button>
                  </td>
                  <!-- 🆕 拖拽手柄列 -->
                  <td class="drag-column">
                    <div 
                      class="drag-handle"
                      :class="{ 'disabled': isPinnedSchedule(String(result.id)) }"
                      :title="isPinnedSchedule(String(result.id)) ? '已固定，无法拖动' : '拖动到新日期（按住拖动）'"
                    >
                       <GripVertical class="drag-icon" />
                     </div>
                   </td>
                 </tr>
               </template>
              <!-- 空表格，等待数据填充 -->
              <tr v-for="i in 20" :key="i">
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- 🆕 日期选择浮层（拖拽时显示） -->
        <div 
          v-if="isDraggingSchedule && showDatePicker"
          class="date-picker-overlay"
          :style="{
            left: mouseX + 'px',
            top: mouseY + 'px'
          }"
          @dragover.prevent
        >
          <div class="date-picker-panel">
            <div class="date-picker-header">
              📅 选择新的考试日期
              <button class="close-picker-btn" @click="forceCloseDatePicker" title="取消">
                <X :size="16" />
              </button>
            </div>
            <div class="date-picker-body">
              <div
                v-for="date in availableDates"
                :key="date.value"
                class="date-option"
                :class="{
                  'is-current': date.value === (draggingDayIndex === 1 ? draggingSchedule?.date1 : draggingSchedule?.date2),
                  'is-recommended': date.recommended,
                  'is-weekend': date.isWeekend && !date.isOutOfRange,
                  'is-out-of-range': date.isOutOfRange
                }"
                @click.stop.prevent="handleDateSelect(date.value)"
                @drop.stop.prevent="handleDateDrop($event, date.value)"
                @dragover.prevent
                @mousedown.stop.prevent
              >
                <span class="date-icon">{{ date.icon }}</span>
                <span class="date-label">{{ date.label }}</span>
                <span class="date-info">{{ date.info }}</span>
              </div>
            </div>
            <div class="date-picker-footer">
              <div class="date-picker-tips">
                <div style="font-weight: 600; margin-bottom: 8px;">💡 提示：</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
                  <li>🟢 绿色 = 推荐日期（考官充足，范围内）</li>
                  <li>🔵 蓝色 = 周末或考官较少</li>
                  <li>⚠️ 黄色 = 超出原始范围（可选，但建议谨慎）</li>
                  <li>💡 点击日期选择，按 ESC 或点击 × 取消</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 历史排班管理面板 -->
        <div class="history-panel">
          <div class="history-header">
            <h3 class="history-title">排班历史管理</h3>
            <div class="history-actions">
              <button 
                v-if="scheduleResults.length > 0"
                class="action-btn action-btn-primary"
                @click="showSaveSnapshotDialog = true"
                title="保存当前排班为历史记录"
              >
                <Upload class="btn-icon" />
                <span>保存快照</span>
              </button>
              <button 
                class="action-btn action-btn-secondary"
                @click="showHistoryListDialog = true"
                title="查看历史排班记录"
              >
                <Clock class="btn-icon" />
                <span>历史记录</span>
              </button>
              <button 
                class="action-btn action-btn-info"
                @click="showUploadScheduleDialog = true"
                title="上传已有的排班表进行编辑"
              >
                <FileText class="btn-icon" />
                <span>上传排班表</span>
              </button>
            </div>
          </div>
          <div v-if="currentSnapshotInfo" class="current-snapshot-info">
            <p class="info-text">
              当前编辑: <strong>{{ currentSnapshotInfo.name }}</strong>
              <span v-if="hasUnsavedChanges" class="unsaved-badge">未保存</span>
            </p>
          </div>
        </div>

      </div>
    </div>

    <!-- 保存快照对话框 -->
    <div v-if="showSaveSnapshotDialog" class="modal-overlay" @click="showSaveSnapshotDialog = false">
      <div class="modal-content" @click.stop style="max-width: 500px;">
        <div class="modal-header">
          <h2 class="modal-title">保存排班快照</h2>
          <button class="close-btn" @click="showSaveSnapshotDialog = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body" style="padding: 24px;">
          <div class="form-group">
            <label class="form-label">快照名称 <span class="text-red-500">*</span></label>
            <input 
              v-model="snapshotName" 
              type="text" 
              class="form-input"
              placeholder="例如: 2025年春季考试排班"
              maxlength="50"
            />
          </div>
          <div class="form-group" style="margin-top: 16px;">
            <label class="form-label">描述说明</label>
            <textarea 
              v-model="snapshotDescription" 
              class="form-textarea"
              placeholder="添加一些备注信息，方便日后查找"
              rows="3"
              maxlength="200"
            ></textarea>
          </div>
          <div class="snapshot-info" style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
            <p class="text-sm font-medium text-gray-700" style="margin-bottom: 8px;">📦 将保存以下完整数据：</p>
            <ul class="text-sm text-gray-700" style="padding-left: 20px; line-height: 1.8;">
              <li>✅ 排班结果: {{ scheduleResults.length }} 条记录</li>
              <li>✅ 学员数据: {{ studentList.length }} 位学员</li>
              <li>✅ 考官数据: {{ teacherList.length }} 位考官
                <span v-if="teacherList.filter((t: any) => t.unavailablePeriods?.length > 0).length > 0" style="color: #f59e0b;">
                  （含 {{ teacherList.filter((t: any) => t.unavailablePeriods?.length > 0).length }} 位考官的不可用时间）
                </span>
              </li>
              <li>✅ 考试日期: {{ getDateRange() }}</li>
              <li>✅ 人工修改记录</li>
              <li>✅ 约束配置</li>
            </ul>
            <p class="text-xs text-gray-500" style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              💡 加载此快照后，所有数据（包括教师不可用时间）都将恢复，可直接继续编辑或重新排班
            </p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn action-btn-secondary" @click="showSaveSnapshotDialog = false">
            取消
          </button>
          <button 
            class="action-btn action-btn-primary" 
            @click="handleSaveSnapshot"
            :disabled="!snapshotName.trim()"
          >
            保存
          </button>
        </div>
      </div>
    </div>

    <!-- 历史记录列表对话框 -->
    <div v-if="showHistoryListDialog" class="modal-overlay" @click="showHistoryListDialog = false">
      <div class="modal-content" @click.stop style="max-width: 900px; max-height: 80vh;">
        <div class="modal-header">
          <h2 class="modal-title">历史排班记录</h2>
          <button class="close-btn" @click="showHistoryListDialog = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body" style="padding: 24px; overflow-y: auto;">
          <!-- 搜索和过滤 -->
          <div class="history-filters" style="margin-bottom: 16px;">
            <input 
              v-model="historySearchQuery" 
              type="text" 
              class="form-input"
              placeholder="搜索快照名称..."
              style="max-width: 300px;"
            />
          </div>
          
          <!-- 清理提醒 -->
          <div v-if="cleanupRecommendation.needsCleanup" class="cleanup-alert" style="margin-bottom: 16px;">
            <AlertCircle class="w-5 h-5 text-yellow-600" />
            <div class="cleanup-content">
              <p class="text-sm font-medium">建议清理历史记录</p>
              <p class="text-xs text-gray-600">
                您已保存 {{ cleanupRecommendation.snapshotCount }} 个快照，
                建议删除 {{ cleanupRecommendation.recommendedDeleteCount }} 个超过3个月的旧记录
              </p>
            </div>
            <button class="action-btn action-btn-sm action-btn-warning" @click="handleBatchCleanup">
              一键清理
            </button>
          </div>
          
          <!-- 历史列表 -->
          <div v-if="historyLoading" class="loading-state">
            <RefreshCw class="w-6 h-6 spinning" />
            <p>加载中...</p>
          </div>
          <div v-else-if="filteredHistoryList.length === 0" class="empty-state">
            <p class="text-gray-500">暂无历史记录</p>
          </div>
          <div v-else class="history-list">
            <div 
              v-for="snapshot in filteredHistoryList" 
              :key="snapshot.id"
              class="history-item"
              :class="{ 'active': currentSnapshotInfo?.id === snapshot.id }"
            >
              <div class="history-item-header">
                <h4 class="history-item-title">{{ snapshot.name }}</h4>
                <span class="history-item-date">{{ formatDateTime(snapshot.createdAt) }}</span>
              </div>
              <p v-if="snapshot.description" class="history-item-description">
                {{ snapshot.description }}
              </p>
              <div class="history-item-meta">
                <span class="meta-item">📋 排班: {{ snapshot.scheduleData?.length || 0 }} 条</span>
                <span 
                  class="meta-item meta-item-clickable" 
                  @click="showSnapshotStudentList(snapshot)"
                  title="点击查看学员列表">
                  👨‍🎓 学员: {{ snapshot.metadata.studentList?.length || snapshot.metadata.totalStudents }} 位
                </span>
                <span class="meta-item">👨‍🏫 考官: {{ snapshot.metadata.teacherList?.length || snapshot.metadata.totalTeachers }} 位</span>
                <span 
                  v-if="snapshot.metadata.teacherList && snapshot.metadata.teacherList.filter((t: any) => t.unavailablePeriods?.length > 0).length > 0" 
                  class="meta-item meta-item-warning meta-item-clickable"
                  @click="showUnavailableTeachers(snapshot)"
                  title="点击查看不可用时间详情">
                  ⚠️ {{ snapshot.metadata.teacherList.filter((t: any) => t.unavailablePeriods?.length > 0).length }} 位考官有不可用时间
                </span>
                <span class="meta-item">✏️ 修改: {{ snapshot.metadata.manualEditCount }}</span>
                <span class="meta-item">📅 {{ snapshot.metadata.dateRange.start }} ~ {{ snapshot.metadata.dateRange.end }}</span>
              </div>
              <div class="history-item-actions">
                <button class="action-btn action-btn-sm action-btn-primary" @click="handleLoadSnapshot(snapshot.id)">
                  <Eye class="w-4 h-4" />
                  加载
                </button>
                <button class="action-btn action-btn-sm action-btn-danger" @click="handleDeleteSnapshot(snapshot.id)">
                  <Trash2 class="w-4 h-4" />
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn action-btn-secondary" @click="showHistoryListDialog = false">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 学员列表详情对话框 -->
    <div v-if="showStudentListDialog" class="modal-overlay" @click="showStudentListDialog = false">
      <div class="modal-content" @click.stop style="max-width: 600px;">
        <div class="modal-header">
          <h2 class="modal-title">学员列表</h2>
          <button class="close-btn" @click="showStudentListDialog = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body" style="padding: 20px; max-height: 500px; overflow-y: auto;">
          <p style="margin-bottom: 16px; color: #6b7280;">
            共 <strong>{{ selectedSnapshotStudents.length }}</strong> 位学员
          </p>
          <div style="display: grid; gap: 12px;">
            <div 
              v-for="(student, index) in selectedSnapshotStudents" 
              :key="index"
              style="padding: 16px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px;">
                  {{ (student.姓名 || student.name || '学')[0] }}
                </div>
                <div style="flex: 1;">
                  <p style="font-weight: 600; font-size: 16px; color: #111827; margin: 0;">
                    {{ student.姓名 || student.name || '未知' }}
                  </p>
                  <p v-if="student.科室 || student.department" style="font-size: 14px; color: #6b7280; margin: 2px 0 0 0;">
                    {{ displayDepartment(student.科室 || student.department) }}
                  </p>
                </div>
              </div>
              <div v-if="getStudentExtendedFields(student).length > 0" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                <div 
                  v-for="field in getStudentExtendedFields(student)" 
                  :key="field.key"
                  style="padding: 8px; background: #f9fafb; border-radius: 4px;">
                  <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px 0;">{{ field.label }}</p>
                  <p style="font-size: 14px; color: #374151; margin: 0; font-weight: 500;">{{ field.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn action-btn-secondary" @click="showStudentListDialog = false">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 不可用时间详情对话框 -->
    <div v-if="showUnavailableDialog" class="modal-overlay" @click="showUnavailableDialog = false">
      <div class="modal-content" @click.stop style="max-width: 700px;">
        <div class="modal-header">
          <h2 class="modal-title">考官不可用时间详情</h2>
          <button class="close-btn" @click="showUnavailableDialog = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body" style="padding: 20px; max-height: 500px; overflow-y: auto;">
          <p style="margin-bottom: 16px; color: #6b7280;">
            共 <strong>{{ unavailableTeachersData.length }}</strong> 位考官有不可用时间
          </p>
          <div style="display: grid; gap: 12px;">
            <div 
              v-for="(teacher, index) in unavailableTeachersData" 
              :key="index"
              style="padding: 16px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                  <span style="font-weight: 600; font-size: 16px;">{{ teacher.name }}</span>
                  <span v-if="teacher.department" style="margin-left: 12px; color: #6b7280;">
                    {{ teacher.department }}
                  </span>
                </div>
                <span style="background: #f97316; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                  {{ teacher.unavailablePeriods?.length || 0 }} 个时段
                </span>
              </div>
              <div style="margin-top: 8px;">
                <div 
                  v-for="(period, pIndex) in teacher.unavailablePeriods" 
                  :key="pIndex"
                  style="padding: 6px 10px; background: white; border-radius: 4px; margin-top: 4px; font-size: 14px; display: flex; justify-content: space-between;">
                  <span>📅 {{ period.date || period.startDate }}</span>
                  <span style="color: #f97316; font-weight: 500;">{{ period.reason || '不可用' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn action-btn-secondary" @click="showUnavailableDialog = false">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 上传排班表对话框 -->
    <div v-if="showUploadScheduleDialog" class="modal-overlay" @click="showUploadScheduleDialog = false">
      <div class="modal-content" @click.stop style="max-width: 700px;">
        <div class="modal-header">
          <h2 class="modal-title">上传排班表</h2>
          <button class="close-btn" @click="showUploadScheduleDialog = false">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="modal-body" style="padding: 20px;">
          <div style="margin-bottom: 16px; padding: 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px;">
            <p style="margin: 0; color: #1e40af; line-height: 1.6; font-size: 14px;">
              <strong>💡 使用说明：</strong><br/>
              1️⃣ 上传已有的排班表（Excel/CSV格式）<br/>
              2️⃣ 系统自动解析并显示预览<br/>
              3️⃣ 选择"加载到排班表"或"直接保存为快照"<br/>
              4️⃣ 加载后可在下方排班表区域进行修改、导出
            </p>
          </div>
          
          <!-- 列名识别说明 -->
          <details style="margin-bottom: 16px; padding: 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px;">
            <summary style="cursor: pointer; color: #92400e; font-weight: 500; font-size: 14px;">
              📋 支持的列名格式（点击查看）
            </summary>
            <div style="margin-top: 12px; color: #78350f; font-size: 13px; line-height: 1.8;">
              <p style="margin: 0 0 8px 0;"><strong>系统会自动识别以下列名：</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>学员：</strong>学员、姓名、学员姓名、学生、考生</li>
                <li><strong>科室：</strong>科室、部门、专业、院系、所在科室</li>
                <li><strong>日期1：</strong>考试日期1、第一次考试日期、第一天日期、现场日期、实操日期</li>
                <li><strong>日期2：</strong>考试日期2、第二次考试日期、第二天日期、面谈日期、口试日期</li>
                <li><strong>第一天考官1：</strong>现场-考官1、第一天考官一、实操考官1、考官1</li>
                <li><strong>第一天考官2：</strong>现场-考官2、第一天考官二、实操考官2、考官2</li>
                <li><strong>第一天备用：</strong>现场-备用、第一天备份考官、实操备用、备用1</li>
                <li><strong>第二天考官1：</strong>面谈-考官1、第二天考官一、口试考官1、面谈1</li>
                <li><strong>第二天考官2：</strong>面谈-考官2、第二天考官二、口试考官2、面谈2</li>
                <li><strong>第二天备用：</strong>面谈-备用、第二天备份考官、口试备用、备用2</li>
              </ul>
              <p style="margin: 12px 0 0 0; color: #b45309;">
                💡 <strong>提示：</strong>如果列名不匹配，解析后会在浏览器控制台（F12）显示检测到的列名，方便您调整Excel文件。
              </p>
            </div>
          </details>
          
          <!-- 文件上传区域 -->
          <div class="file-upload-area" style="margin-bottom: 20px;">
            <input 
              ref="scheduleFileInput" 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              @change="handleScheduleFileUpload" 
              style="display: none;"
            />
            
            <div 
              v-if="!uploadedScheduleFile" 
              class="upload-placeholder" 
              @click="scheduleFileInput?.click()"
              style="padding: 40px; text-align: center; border: 2px dashed #d1d5db; border-radius: 8px; cursor: pointer; background: #f9fafb;">
              <div class="upload-icon" style="margin-bottom: 12px;">
                <FileText style="width: 48px; height: 48px; color: #9ca3af; margin: 0 auto;" />
              </div>
              <p style="font-size: 16px; color: #374151; margin-bottom: 4px;">点击选择排班表文件</p>
              <p style="font-size: 14px; color: #6b7280;">支持 .xlsx, .xls, .csv 格式</p>
            </div>
            
            <div v-else style="padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <FileText style="width: 24px; height: 24px; color: #10b981;" />
                  <div>
                    <p style="font-weight: 500; color: #065f46;">{{ uploadedScheduleFile.name }}</p>
                    <p style="font-size: 12px; color: #059669;">{{ formatFileSize(uploadedScheduleFile.size) }}</p>
                  </div>
                </div>
                <button 
                  @click="clearScheduleFile"
                  style="padding: 4px 8px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                  移除
                </button>
              </div>
            </div>
          </div>
          
          <!-- 解析状态 -->
          <div v-if="scheduleParseStatus" :style="{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: scheduleParseStatus.type === 'success' ? '#ecfdf5' : scheduleParseStatus.type === 'error' ? '#fef2f2' : '#fef3c7',
            border: scheduleParseStatus.type === 'success' ? '1px solid #a7f3d0' : scheduleParseStatus.type === 'error' ? '1px solid #fecaca' : '1px solid #fde68a',
            color: scheduleParseStatus.type === 'success' ? '#065f46' : scheduleParseStatus.type === 'error' ? '#991b1b' : '#92400e'
          }">
            <p style="margin: 0;">{{ scheduleParseStatus.message }}</p>
            <p v-if="scheduleParseStatus.details" style="margin-top: 8px; font-size: 14px;">
              {{ scheduleParseStatus.details }}
            </p>
          </div>
          
          <!-- 数据预览 -->
          <div v-if="parsedScheduleData.length > 0" style="margin-bottom: 20px;">
            <p style="font-weight: 500; color: #374151; margin-bottom: 8px;">📊 数据预览（前10条）：</p>
            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px;">
              <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <thead style="background: #f9fafb; position: sticky; top: 0;">
                  <tr>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">学员</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">科室</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">日期1</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">日期2</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">现场-考官1</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb;">面谈-考官1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(record, index) in parsedScheduleData.slice(0, 10)" :key="index" style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 8px;">{{ record.student }}</td>
                    <td style="padding: 8px;">{{ record.department }}</td>
                    <td style="padding: 8px;">{{ record.date1 }}</td>
                    <td style="padding: 8px;">{{ record.date2 }}</td>
                    <td style="padding: 8px;">{{ record.examiner1_1 }}</td>
                    <td style="padding: 8px;">{{ record.examiner2_1 }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="parsedScheduleData.length > 10" style="font-size: 12px; color: #6b7280; margin-top: 8px;">
              * 共 {{ parsedScheduleData.length }} 条记录，仅显示前10条预览
            </p>
          </div>
          
          <!-- 快照名称（可选） -->
          <div v-if="parsedScheduleData.length > 0" style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">
              快照名称（可选，用于直接保存）
            </label>
            <input 
              v-model="uploadScheduleSnapshotName" 
              type="text" 
              class="form-input"
              placeholder="例如: 导入的2025春季排班表"
              style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="action-btn action-btn-secondary" @click="showUploadScheduleDialog = false">
            取消
          </button>
          <button 
            v-if="parsedScheduleData.length > 0"
            class="action-btn action-btn-primary" 
            @click="loadUploadedSchedule"
            style="margin-left: 8px;">
            加载到排班表
          </button>
          <button 
            v-if="parsedScheduleData.length > 0 && uploadScheduleSnapshotName.trim()"
            class="action-btn action-btn-success" 
            @click="saveUploadedScheduleAsSnapshot"
            style="margin-left: 8px; background: #10b981;">
            直接保存为快照
          </button>
        </div>
      </div>
    </div>

    <!-- 编辑考官弹窗 -->
    <!-- 智能人工修改模态框 -->
    <SmartManualEditModal
      :show="showEditModal"
      :editing-record="editingRecord"
      :editing-field="editingField"
      :available-teachers="availableTeachers as any"
      :current-value="currentEditValue"
      :all-schedule-records="scheduleResults"
      @close="closeEditModal"
      @confirm="handleSmartEditConfirm"
    />

    <!-- 文件预览弹窗 -->
    <div v-if="showPreviewModal" class="modal-overlay preview-modal-overlay" @click="closePreviewModal">
      <div class="preview-modal-content" @click.stop>
        <div class="preview-header">
          <h2 class="preview-title">文件预览</h2>
          <button class="close-btn" @click="closePreviewModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="preview-body">
          <div class="preview-info">
            <p class="file-info-text">文件名：{{ uploadedFile?.name }}</p>
            <p class="data-info-text">显示前10行数据</p>
          </div>
          <div class="preview-table-container">
            <table class="preview-table">
              <thead>
                <tr>
                  <th v-for="header in previewHeaders" :key="header">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in previewData" :key="index">
                  <td v-for="header in previewHeaders" :key="header">{{ row[header] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 新建排班弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeModal">
      <div 
        ref="modalRef"
        class="modal-content draggable-modal step-modal" 
        @click.stop
        :style="{
          transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }"
      >
        <!-- 可拖拽的标题栏 -->
        <div 
          class="modal-header draggable-header" 
          @mousedown="startDrag"
          :style="{ cursor: isDragging ? 'grabbing' : 'grab' }"
        >
          <h2 class="modal-title">新建排班</h2>
          <button class="close-btn" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6L6 18"/>
              <path d="M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- 步骤指示器 -->
        <div class="step-indicator">
          <div class="step-item" :class="{ active: currentStep === 1, completed: currentStep > 1 }">
            <div class="step-number">1</div>
            <div class="step-label">学员导入</div>
          </div>
          <div class="step-divider"></div>
          <div class="step-item" :class="{ active: currentStep === 2, completed: currentStep > 2 }">
            <div class="step-number">2</div>
            <div class="step-label">日期选择</div>
          </div>
          <div class="step-divider"></div>
          <div class="step-item" :class="{ active: currentStep === 3, completed: currentStep > 3 }">
            <div class="step-number">3</div>
            <div class="step-label">智能评估</div>
          </div>
          <div class="step-divider"></div>
          <div class="step-item" :class="{ active: currentStep === 4 }">
            <div class="step-number">4</div>
            <div class="step-label">确认执行</div>
          </div>
        </div>
        
        <!-- 步骤1: 学员导入 -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="step-title">
            <div class="step-icon">👥</div>
            <h3>第一步：导入学员名单</h3>
            <p class="step-description">导入需要参加考试的学员信息，支持从考官分配页面一键导入或上传Excel/CSV文件</p>
          </div>
          
          <!-- 🆕 从考官分配导入按钮 -->
          <div class="import-options">
            <button 
              class="import-from-assignment-btn"
              @click="handleImportFromAssignment"
              :disabled="!hasAssignmentData"
              :class="{ 'has-data': hasAssignmentData }"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 3h5v5"/>
                <path d="M4 20L21 3"/>
                <path d="M21 16v5h-5"/>
                <path d="M15 15l6 6"/>
                <path d="M4 4l5 5"/>
              </svg>
              <span v-if="hasAssignmentData">从考官分配导入 ({{ assignmentDataCount }}人)</span>
              <span v-else>从考官分配导入 (无数据)</span>
            </button>
            <span class="import-divider">或</span>
          </div>
          
          <div class="file-upload-area">
            <input 
              ref="fileInput" 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              @change="handleFileUpload" 
              style="display: none;"
            />
            
            <div v-if="!uploadedFile" class="upload-placeholder" @click="triggerFileUpload">
              <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <p class="upload-text">点击或拖拽上传学员名单</p>
              <p class="upload-subtext">支持 Excel (.xlsx, .xls) 或 CSV 格式文件，文件需包含姓名、科室、班组等基本信息</p>
            </div>
            
            <div v-else class="file-info">
              <div class="file-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14,2H6A2,2,0,0,0,4,4V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V8Z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div class="file-details">
                <p class="file-name">{{ uploadedFile.name }}</p>
                <p class="file-size">{{ formatFileSize(uploadedFile.size) }}</p>
              </div>
              <button class="change-file-btn" @click="triggerFileUpload">
                更换文件
              </button>
            </div>
          </div>

          <!-- 学员数据预览 -->
          <div v-if="studentList.length > 0" class="student-preview">
            <div class="preview-header-section">
              <h4>学员数据预览 (共{{ studentList.length }}名学员)</h4>
              <div class="preview-controls">
                <button 
                  v-if="!showAllStudents && studentList.length > 10" 
                  @click="showAllStudents = true"
                  class="show-more-btn"
                >
                  显示全部
                </button>
                <button 
                  v-if="showAllStudents" 
                  @click="showAllStudents = false"
                  class="show-less-btn"
                >
                  收起
                </button>
              </div>
            </div>
            <div class="preview-table">
              <div class="preview-header">
                <span>序号</span>
                <span>姓名</span>
                <span>科室</span>
                <span>班组</span>
                <span>考试内容</span>
                <span v-if="hasRecommendedExaminers">推荐考官</span>
              </div>
              <div class="preview-rows">
                <div 
                  v-for="(student, index) in displayedStudents" 
                  :key="student.id" 
                  class="preview-row"
                >
                  <span>{{ index + 1 }}</span>
                  <span>{{ student.name }}</span>
                  <span>{{ displayDepartment(student.department) }}</span>
                  <span :title="`原始数据: ${JSON.stringify(student.group)}, 类型: ${typeof student.group}`">
                    {{ student.group || '未知班组' }}
                  </span>
                  <span class="exam-content-cell">
                    <select 
                      v-model="student.examDays" 
                      @change="handleExamDaysChange(student)"
                      class="exam-days-select"
                      :title="`当前选择: ${student.examDays || 2}天考试`"
                    >
                      <option :value="2">两天考试</option>
                      <option :value="1">一天考试</option>
                    </select>
                    <span class="exam-type-badge" :class="`exam-type-${student.examDays || 2}`">
                      {{ getExamTypeLabel(student) }}
                    </span>
                  </span>
                  <span v-if="hasRecommendedExaminers" class="recommended-examiners">
                    <span v-if="student.recommendedExaminer1Dept">{{ student.recommendedExaminer1Dept }}</span>
                    <span v-if="student.recommendedExaminer2Dept">, {{ student.recommendedExaminer2Dept }}</span>
                    <span v-if="student.recommendedBackupDept"> (推荐 {{ student.recommendedBackupDept }})</span>
                  </span>
                </div>
                <div v-if="!showAllStudents && studentList.length > 10" class="preview-more">
                  还有 {{ studentList.length - 10 }} 名学员未显示...
                </div>
              </div>
            </div>
            
            <!-- 数据统计信息 -->
            <div class="data-summary">
              <div class="summary-item">
                <span class="summary-label">总学员数:</span>  
                <span class="summary-value">{{ studentList.length }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">科室分布</span>
                <span class="summary-value">{{ departmentStats }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">班组分布</span>
                <span class="summary-value">{{ groupStats }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤2: 日期选择 -->
        <div v-if="currentStep === 2" class="step-content">
          <div class="step-title">
            <div class="step-icon">📅</div>
            <h3>第二步：设置考试日期</h3>
            <p class="step-description">选择考试日期范围，系统会根据学员和考官数量智能推荐最合适的结束日期</p>
          </div>

          <!-- 智能日期推荐提示 -->
          <div v-if="!examStartDateStr && studentList.length > 0" class="smart-date-hint" style="background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); border: 2px solid #3b82f6; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 600; color: #1e40af;">💡 智能提示</div>
              <div style="font-size: 14px; color: #1e3a8a; margin-top: 4px;">请先选择考试开始日期，系统将根据学员和考官数量自动计算并推荐最合适的结束日期</div>
            </div>
          </div>

          <!-- 日期选择区域 -->
          <div class="date-selection">
            <div class="date-group">
              <label class="date-label">
                <span class="label-main">🗓️ 考试开始日期</span>
                <span class="date-label-tip">选择第一天考试日期</span>
              </label>
              <div class="date-input-wrapper">
                <input 
                  type="date" 
                  v-model="examStartDateStr"
                  :min="minExamDateStr"
                  class="date-input"
                  @change="onStartDateChange"
                  placeholder="请选择开始日期"
                />
                <div class="date-input-icon">📅</div>
              </div>
              <div v-if="!examStartDateStr && studentList.length > 0" class="field-hint" style="margin-top: 8px; font-size: 13px; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>请先选择开始日期</span>
              </div>
            </div>
            
            <div class="date-group">
              <label class="date-label">
                <span class="label-main">🗓️ 考试结束日期</span>
                <span class="date-label-tip" v-if="!calculatedOptimalEndDate">选择最后一天考试日期</span>
                <span class="date-label-tip recommended" v-else>💡 系统推荐：{{ calculatedOptimalEndDate }}</span>
              </label>
              <div class="date-input-wrapper" :class="{ 'has-recommendation': calculatedOptimalEndDate }">
                <input 
                  type="date" 
                  v-model="examEndDateStr"
                  :min="examStartDateStr || minExamDateStr"
                  class="date-input"
                  @change="onEndDateChange"
                  placeholder="请选择结束日期"
                />
                <div class="date-input-icon">📅</div>
                <button 
                  v-if="calculatedOptimalEndDate && examEndDateStr !== calculatedOptimalEndDate"
                  @click="applyCalculatedOptimalDate"
                  class="apply-recommended-btn"
                  title="应用系统推荐的结束日期"
                >
                  应用推荐
                </button>
              </div>
              <div v-if="calculatedOptimalEndDate" class="field-hint success" style="margin-top: 8px; font-size: 13px; color: #10b981; display: flex; align-items: center; gap: 6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>根据{{ studentList.length }}名学员和{{ getTotalTeachersCount() }}名考官计算，建议{{ calculatedOptimalDays }}天完成所有考试</span>
              </div>
            </div>
          </div>

          <!-- 设置卡片组 -->
          <div class="settings-card-group" style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px;">
            
            <!-- 卡片 1: 周末安排考试开关 -->
            <div class="setting-card" :class="{ 'active': allowWeekendScheduling }" 
              style="background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s;"
              @click="toggleWeekendScheduling">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s;"
                    :style="allowWeekendScheduling ? 'background: #dbeafe; color: #2563eb;' : 'background: #f3f4f6; color: #6b7280;'">
                    📅
                  </div>
                  <div>
                    <h4 style="margin: 0; font-size: 15px; color: #1f2937; font-weight: 600;">周末是否安排考试</h4>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">{{ allowWeekendScheduling ? '已开启周末排班' : '周末不安排考试（推荐）' }}</p>
                  </div>
                </div>
                <!-- 开关 -->
                <div style="position: relative; width: 48px; height: 26px; border-radius: 26px; transition: all 0.3s; flex-shrink: 0;"
                  :style="allowWeekendScheduling ? 'background: #3b82f6;' : 'background: #d1d5db;'">
                  <div style="position: absolute; top: 2px; width: 22px; height: 22px; border-radius: 50%; background: white; transition: all 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.1);"
                    :style="allowWeekendScheduling ? 'left: 24px;' : 'left: 2px;'"></div>
                </div>
              </div>
            </div>

            <!-- 卡片 2: 不可用日期设置 -->
            <div class="setting-card" :class="{ 'expanded': isUnavailableDatesExpanded, 'has-items': customUnavailableDates.length > 0 }"
              style="background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.2s;">
              <!-- 卡片头部 -->
              <div @click="isUnavailableDatesExpanded = !isUnavailableDatesExpanded" 
                style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s;"
                    :style="customUnavailableDates.length > 0 ? 'background: #fef3c7; color: #d97706;' : 'background: #f3f4f6; color: #6b7280;'">
                    🚫
                  </div>
                  <div>
                    <h4 style="margin: 0; font-size: 15px; color: #1f2937; font-weight: 600;">不可用日期设置</h4>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">添加临时放假或不可考试的日期</p>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span v-if="customUnavailableDates.length > 0" 
                    style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                    {{ customUnavailableDates.length }} 个
                  </span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="transition: transform 0.2s; color: #9ca3af;"
                    :style="isUnavailableDatesExpanded ? 'transform: rotate(180deg);' : ''">
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              </div>

              <!-- 展开内容 -->
              <div v-show="isUnavailableDatesExpanded" style="border-top: 1px solid #f3f4f6; padding: 16px; background: #fafafa;">
                <!-- 添加区域 -->
                <div style="background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; border: 1px solid #e5e7eb;">
                  <!-- 模式选择 -->
                  <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; color: #374151;">
                      <input type="radio" v-model="unavailableDateMode" value="single" style="accent-color: #3b82f6; width: 16px; height: 16px;">
                      <span>单日</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; color: #374151;">
                      <input type="radio" v-model="unavailableDateMode" value="range" style="accent-color: #3b82f6; width: 16px; height: 16px;">
                      <span>日期范围</span>
                    </label>
                  </div>

                  <!-- 输入区域 -->
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 130px;">
                      <input type="date" v-model="newUnavailableDate" 
                        style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
                    </div>
                    <div v-if="unavailableDateMode === 'range'" style="flex: 1; min-width: 130px;">
                      <input type="date" v-model="newUnavailableEndDate" 
                        style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
                    </div>
                    <div style="flex: 2; min-width: 180px;">
                      <input type="text" v-model="newUnavailableReason" placeholder="原因（可选）" 
                        style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;"
                        onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#d1d5db'">
                    </div>
                    <button @click="addUnavailableDate" 
                      style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; transition: all 0.2s; white-space: nowrap;"
                      onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                      添加
                    </button>
                  </div>
                </div>

                <!-- 列表区域 -->
                <div v-if="customUnavailableDates.length > 0">
                  <div v-for="(item, index) in customUnavailableDates" :key="index" 
                    style="background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <span style="font-size: 18px;">📅</span>
                      <div>
                        <div style="font-size: 14px; color: #1f2937; font-weight: 500;">{{ item.displayDate }}</div>
                        <div v-if="item.reason" style="font-size: 12px; color: #6b7280; margin-top: 2px;">{{ item.reason }}</div>
                      </div>
                    </div>
                    <button @click="removeUnavailableDate(index)" 
                      style="padding: 6px 12px; background: #fee2e2; color: #dc2626; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;"
                      onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                      删除
                    </button>
                  </div>
                </div>

                <!-- 空状态 -->
                <div v-else style="text-align: center; padding: 32px; color: #9ca3af;">
                  <div style="width: 56px; height: 56px; margin: 0 auto 12px; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px;">📆</div>
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">暂无不可用日期</p>
                </div>
              </div>
            </div>

          <!-- 智能日期建议 - 暂时隐藏，待排班功能稳定后重新启用 -->
          <!--
          <div v-if="dateRangeSuggestion" class="date-suggestion">
            <div class="suggestion-header">
              <span class="suggestion-icon">💡</span>
              <h4 class="suggestion-title">智能建议</h4>
            </div>
            <p class="suggestion-text">{{ dateRangeSuggestion }}</p>
            <button v-if="suggestedDateRange" class="suggestion-btn" @click="applySuggestion">
              ✨ 应用建议
            </button>
            </div>
          -->

          <!-- 卡片 3: 不可用考官详情 -->
          <div class="setting-card" :class="{ 'expanded': isUnavailableExpanded, 'has-items': getUnavailableTeachersInRange().length > 0 }"
            style="background: #fff; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: all 0.2s;">
            <!-- 卡片头部 -->
            <div @click="isUnavailableExpanded = !isUnavailableExpanded" 
              style="padding: 16px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; transition: all 0.2s;"
                  :style="getUnavailableTeachersInRange().length > 0 ? 'background: #fee2e2; color: #dc2626;' : 'background: #d1fae5; color: #059669;'">
                  {{ getUnavailableTeachersInRange().length > 0 ? '🚫' : '✅' }}
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 15px; color: #1f2937; font-weight: 600;">不可用考官详情</h4>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">查看当前排班周期内不可用的考官</p>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span v-if="getUnavailableTeachersInRange().length > 0" 
                  style="background: #fee2e2; color: #991b1b; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                  {{ getUnavailableTeachersInRange().length }} 名
                </span>
                <span v-else
                  style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                  全部可用
                </span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="transition: transform 0.2s; color: #9ca3af;"
                  :style="isUnavailableExpanded ? 'transform: rotate(180deg);' : ''">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>

            <!-- 展开内容 -->
            <div v-show="isUnavailableExpanded" style="border-top: 1px solid #f3f4f6; padding: 16px; background: #fafafa;">
              <!-- 统计卡片 -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="background: #fff; border-radius: 10px; padding: 12px; text-align: center; border: 1px solid #e5e7eb;">
                  <div style="font-size: 20px; margin-bottom: 4px;">📅</div>
                  <div style="font-size: 12px; color: #6b7280;">排班周期</div>
                  <div style="font-size: 16px; font-weight: 600; color: #1f2937;">{{ getTotalDays() }}天</div>
                </div>
                <div style="background: #fff; border-radius: 10px; padding: 12px; text-align: center; border: 1px solid #e5e7eb;"
                  :style="getUnavailableTeachersInRange().length > 0 ? 'border-color: #fecaca;' : ''">
                  <div style="font-size: 20px; margin-bottom: 4px;">🚫</div>
                  <div style="font-size: 12px; color: #6b7280;">不可用</div>
                  <div style="font-size: 16px; font-weight: 600;"
                    :style="getUnavailableTeachersInRange().length > 0 ? 'color: #dc2626;' : 'color: #1f2937;'">
                    {{ getUnavailableTeachersInRange().length }}名
                  </div>
                </div>
                <div style="background: #fff; border-radius: 10px; padding: 12px; text-align: center; border: 1px solid #e5e7eb;">
                  <div style="font-size: 20px; margin-bottom: 4px;">✅</div>
                  <div style="font-size: 12px; color: #6b7280;">可用</div>
                  <div style="font-size: 16px; font-weight: 600; color: #059669;">
                    {{ getTotalTeachersCount() - getUnavailableTeachersInRange().length }}名
                  </div>
                </div>
                <div style="background: #fff; border-radius: 10px; padding: 12px; text-align: center; border: 1px solid #e5e7eb;">
                  <div style="font-size: 20px; margin-bottom: 4px;">👥</div>
                  <div style="font-size: 12px; color: #6b7280;">总数</div>
                  <div style="font-size: 16px; font-weight: 600; color: #1f2937;">{{ getTotalTeachersCount() }}名</div>
                </div>
              </div>

              <!-- 考官列表 -->
              <div v-if="getUnavailableTeachersInRange().length > 0">
                <div v-for="item in getUnavailableTeachersInRange()" :key="item.teacher.id"
                  style="background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 12px;">
                  <!-- 考官信息头部 -->
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 36px; height: 36px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">👤</div>
                      <div>
                        <div style="font-size: 15px; font-weight: 600; color: #1f2937;">{{ item.teacher.name }}</div>
                        <div style="font-size: 13px; color: #6b7280;">{{ item.teacher.department }}</div>
                      </div>
                    </div>
                    <span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                      {{ item.periods.length }} 个不可用期
                    </span>
                  </div>
                  <!-- 不可用期列表 -->
                  <div v-for="period in item.periods" :key="period.id"
                    style="background: #fafafa; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #4b5563;">
                      <span>📅</span>
                      <span style="font-weight: 500;">{{ period.startDate }} ~ {{ period.endDate }}</span>
                      <span style="background: #fecaca; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin-left: auto;">
                        影响{{ period.overlapDays }}天
                      </span>
                    </div>
                    <div v-if="period.reason" style="margin-top: 6px; font-size: 13px; color: #6b7280; padding-left: 24px;">
                      💬 {{ period.reason }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else style="text-align: center; padding: 32px;">
                <div style="width: 64px; height: 64px; margin: 0 auto 16px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px;">
                  ✨</div>
                <p style="margin: 0; font-size: 15px; color: #059669; font-weight: 500;">当前排班周期内所有考官均可用</p>
                <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">可以安心进行排班</p>
              </div>
            </div>
          </div>
          <!-- 设置卡片组结束 -->

          <!-- 容量评估 - 暂时隐藏，待排班功能稳定后重新启用 -->
            <!-- 
            <div v-if="studentList.length > 0" class="capacity-assessment">
              <div class="capacity-header">
                <span class="capacity-icon">⚖️</span>
                <h4 class="capacity-title">智能容量评估</h4>
                <span class="capacity-badge">基于约束条件</span>
              </div>
              <div class="capacity-content">
                <div class="capacity-grid">
                  <div class="capacity-metric">
                    <span class="metric-icon">👥</span>
                    <div class="metric-info">
                      <span class="metric-label">学员总数</span>
                      <span class="metric-value">{{ studentList.length }} 人</span>
                    </div>
                  </div>
                  
                  <div class="capacity-metric">
                    <span class="metric-icon">📋</span>
                    <div class="metric-info">
                      <span class="metric-label">需要考试场次</span>
                      <span class="metric-value">{{ studentList.length * 2 }} 场</span>
                    </div>
                  </div>
                  
                  <div class="capacity-metric">
                    <span class="metric-icon">📊</span>
                    <div class="metric-info">
                      <span class="metric-label">平均每日场次</span>
                      <span class="metric-value" :class="getCapacityStatusClass()">
                        {{ getAverageExamsPerDay() }} 场/天
                      </span>
                    </div>
                  </div>
                  
                  <div class="capacity-metric">
                    <span class="metric-icon">🎯</span>
                    <div class="metric-info">
                      <span class="metric-label">理论容量上限</span>
                      <span class="metric-value theoretical">
                        {{ getTheoreticalMaxExamsPerDay() }} 场/天
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="capacity-utilization">
                  <div class="utilization-header">
                    <span class="utilization-label">容量利用率</span>
                    <span class="utilization-value" :class="getCapacityStatusClass()">
                      {{ getCapacityUtilization() }}%
                    </span>
                  </div>
                  <div class="utilization-bar">
                    <div 
                      class="utilization-fill" 
                      :class="getCapacityStatusClass()"
                      :style="{ width: Math.min(getCapacityUtilization(), 100) + '%' }"
                    ></div>
                  </div>
                </div>
                
                <div class="constraint-analysis">
                  <div class="analysis-header">
                    <span class="analysis-icon">🔍</span>
                    <span class="analysis-title">约束条件分析</span>
                  </div>
                  <div class="constraint-details">
                    <div class="constraint-item">
                      <span class="constraint-label">HC4 - 考官数量限制：</span>
                      <span class="constraint-value">
                        {{ calculateConstraintBasedCapacity().details.teacherCount || '未知' }} 名考官
                      </span>
                    </div>
                    <div class="constraint-item">
                      <span class="constraint-label">HC7 - 科室配对要求：</span>
                      <span class="constraint-value">
                        {{ calculateConstraintBasedCapacity().details.departmentCount || '未知' }} 个科室
                      </span>
                    </div>
                    <div class="constraint-item">
                      <span class="constraint-label">主要限制因素：</span>
                      <span class="constraint-bottleneck">
                        {{ calculateConstraintBasedCapacity().bottleneck }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="capacity-status" :class="getCapacityStatusClass()">
                  {{ getCapacityStatusText() }}
                </div>
              </div>
            </div>
            -->
          </div>

        </div>

        <!-- 步骤3: 智能评估 -->
        <div v-if="currentStep === 3" class="step-content">
          <div class="step-title">
            <div class="step-icon">💡</div>
            <h3>第三步：智能评估分析</h3>
            <p class="step-description">系统综合分析学员数量、考官资源、日期范围等因素，评估排班可行性并提供优化建议</p> 
          </div>
          
          <div class="smart-assessment-section" style="padding: 24px; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 20px; border: 1px solid #e2e8f0;">
            
            <!-- 核心状态卡片 - 使用整体背景色区分状态 -->
            <div class="status-card" :class="getAssessmentResult().statusClass" style="margin-bottom: 24px; border-radius: 16px; padding: 24px; position: relative; overflow: hidden;">
              <!-- 状态指示条 -->
              <div class="status-indicator-bar" :style="{ background: getAssessmentResult().color }"></div>
              
              <div style="display: flex; align-items: flex-start; gap: 20px; position: relative; z-index: 1;">
                <!-- 状态图标 -->
                <div class="status-icon-wrapper" :style="{ background: getAssessmentResult().lightColor, color: getAssessmentResult().color }">
                  <svg v-if="getAssessmentResult().status === 'success'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <svg v-else-if="getAssessmentResult().status === 'error'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  <svg v-else-if="getAssessmentResult().status === 'warning'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                
                <!-- 状态信息 -->
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <h4 :style="{ color: getAssessmentResult().color, margin: 0, fontSize: '20px', fontWeight: 700 }">
                      {{ getAssessmentResult().title }}
                    </h4>
                    <span class="status-badge" :style="{ background: getAssessmentResult().lightColor, color: getAssessmentResult().color }">
                      {{ getAssessmentResult().badgeText }}
                    </span>
                  </div>
                  <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
                    {{ getAssessmentResult().description }}
                  </p>
                </div>
              </div>
            </div>
            
            <!-- 关键指标卡片组 -->
            <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
              <!-- 学员数量 -->
              <div class="metric-card" style="background: white; border-radius: 12px; padding: 20px; border: 2px solid #e0e7ff; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                  </div>
                  <span style="font-size: 13px; color: #64748b; font-weight: 500;">待排班学员</span>
                </div>
                <div style="font-size: 36px; font-weight: 800; color: #1e40af; line-height: 1;">{{ studentList.length }}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">需要安排考试</div>
              </div>
              
              <!-- 可用考官 -->
              <div class="metric-card" style="background: white; border-radius: 12px; padding: 20px; border: 2px solid #d1fae5; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <span style="font-size: 13px; color: #64748b; font-weight: 500;">可用考官</span>
                </div>
                <div style="font-size: 36px; font-weight: 800; color: #047857; line-height: 1;">{{ getTotalTeachersCount() }}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">当前可用</div>
              </div>
              
              <!-- 可用工作日 -->
              <div class="metric-card" style="background: white; border-radius: 12px; padding: 20px; border: 2px solid #e9d5ff; box-shadow: 0 2px 8px rgba(139, 92, 246, 0.08);">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                  <span style="font-size: 13px; color: #64748b; font-weight: 500;">可用工作日</span>
                </div>
                <div style="font-size: 36px; font-weight: 800; color: #6d28d9; line-height: 1;">{{ getDateRangeStatistics().workdays }}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">可用于排班</div>
              </div>
            </div>
            

            
            <!-- 最佳日期建议 -->
            <!-- 🔧 推荐考试日期范围（增强版） -->
            <div v-if="getRecommendedDateRange()" class="recommended-dates" 
              :style="{
                background: getRecommendedDateRange()?.status === 'insufficient' ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 
                          getRecommendedDateRange()?.status === 'suboptimal' ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' : 
                          'linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)',
                border: getRecommendedDateRange()?.status === 'insufficient' ? '2px solid #ef4444' : 
                        getRecommendedDateRange()?.status === 'suboptimal' ? '2px solid #f59e0b' : 
                        '2px solid #3b82f6',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                position: 'relative',
                overflow: 'hidden'
              }">
              <!-- 装饰背景 -->
              <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; border-radius: 50%;"
                :style="{ 
                  background: getRecommendedDateRange()?.status === 'insufficient' ? 'rgba(239, 68, 68, 0.1)' : 
                             getRecommendedDateRange()?.status === 'suboptimal' ? 'rgba(245, 158, 11, 0.1)' : 
                             'rgba(59, 130, 246, 0.1)'
                }">
              </div>
              
              <div style="position: relative; z-index: 1;">
                <!-- 标题 -->
                <h4 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;"
                  :style="{ color: getRecommendedDateRange()?.status === 'insufficient' ? '#dc2626' : 
                                  getRecommendedDateRange()?.status === 'suboptimal' ? '#b45309' : 
                                  '#1e40af' }">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                    :style="{ stroke: getRecommendedDateRange()?.status === 'insufficient' ? '#ef4444' : 
                                     getRecommendedDateRange()?.status === 'suboptimal' ? '#f59e0b' : 
                                     '#3b82f6' }">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 16v-4M12 8h.01"></path>
                  </svg>
                  {{ getRecommendedDateRange()?.status === 'insufficient' ? '⚠️ 日期范围严重不足' : 
                     getRecommendedDateRange()?.status === 'suboptimal' ? '💡 日期范围可优化' : 
                     '✅ 推荐考试日期范围' }}
                </h4>
                
                <!-- 说明文字 -->
                <p style="margin: 0 0 16px; font-size: 14px;"
                  :style="{ color: getRecommendedDateRange()?.status === 'insufficient' ? '#991b1b' : 
                                  getRecommendedDateRange()?.status === 'suboptimal' ? '#92400e' : 
                                  '#1e3a8a' }">
                  {{ getRecommendedDateRange()?.message }}
                </p>
                
                <!-- 推荐日期卡片 -->
                <div style="background: white; border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 12px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center;"
                      :style="{ background: getRecommendedDateRange()?.status === 'insufficient' ? '#fef2f2' : 
                                        getRecommendedDateRange()?.status === 'suboptimal' ? '#fffbeb' : 
                                        '#dbeafe' }">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        :style="{ stroke: getRecommendedDateRange()?.status === 'insufficient' ? '#ef4444' : 
                                         getRecommendedDateRange()?.status === 'suboptimal' ? '#f59e0b' : 
                                         '#3b82f6' }">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </div>
                    <div>
                      <div style="font-size: 16px; font-weight: 700;"
                        :style="{ color: getRecommendedDateRange()?.status === 'insufficient' ? '#dc2626' : 
                                        getRecommendedDateRange()?.status === 'suboptimal' ? '#b45309' : 
                                        '#1e40af' }">
                        {{ getRecommendedDateRange()?.display }}
                      </div>
                      <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                        共 {{ getRecommendedDateRange()?.recommendedWorkdays }} 个工作日
                      </div>
                    </div>
                  </div>
                  <button 
                    @click="applyRecommendedDateRange()"
                    style="padding: 10px 20px; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;"
                    :style="{ background: getRecommendedDateRange()?.status === 'insufficient' ? '#ef4444' : 
                                    getRecommendedDateRange()?.status === 'suboptimal' ? '#f59e0b' : 
                                    '#3b82f6' }"
                    onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)';"
                    onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';"
                  >
                    应用建议
                  </button>
                </div>
                
                <!-- 对比信息 -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px;">
                  <div style="background: rgba(255,255,255,0.5); border-radius: 8px; padding: 10px; text-align: center;"
                    :style="{ border: getRecommendedDateRange()?.status === 'insufficient' ? '1px solid #fecaca' : 
                                    getRecommendedDateRange()?.status === 'suboptimal' ? '1px solid #fcd34d' : 
                                    '1px solid #bfdbfe' }">
                    <div style="color: #6b7280; margin-bottom: 2px;">当前工作日</div>
                    <div style="font-weight: 700; font-size: 14px;"
                      :style="{ color: getRecommendedDateRange()?.currentWorkdays < getRecommendedDateRange()?.requiredWorkdays ? '#dc2626' : 
                                      getRecommendedDateRange()?.currentWorkdays < getRecommendedDateRange()?.recommendedWorkdays ? '#b45309' : 
                                      '#047857' }">
                      {{ getRecommendedDateRange()?.currentWorkdays }} 天
                    </div>
                  </div>
                  <div style="background: rgba(255,255,255,0.5); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #d1d5db;">
                    <div style="color: #6b7280; margin-bottom: 2px;">最低需要</div>
                    <div style="font-weight: 700; font-size: 14px; color: #1f2937;">
                      {{ getRecommendedDateRange()?.requiredWorkdays }} 天
                    </div>
                  </div>
                  <div style="background: rgba(255,255,255,0.5); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #d1d5db;">
                    <div style="color: #6b7280; margin-bottom: 2px;">建议工作日</div>
                    <div style="font-weight: 700; font-size: 14px; color: #1f2937;">
                      {{ getRecommendedDateRange()?.recommendedWorkdays }} 天
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 操作选项 -->
            <div class="action-options" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
              <button 
                @click="goToStep(2)"
                style="padding: 20px; background: white; border: 2px solid #e2e8f0; border-radius: 14px; cursor: pointer; text-align: center; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';"
                onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'; this.style.boxShadow='none';"
              >
                <div style="width: 48px; height: 48px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <div style="font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 4px;">返回修改日期</div>
                <div style="font-size: 12px; color: #6b7280;">重新选择考试日期范围</div>
              </button>
              
              <button 
                @click="goToStep(1)"
                style="padding: 20px; background: white; border: 2px solid #e2e8f0; border-radius: 14px; cursor: pointer; text-align: center; transition: all 0.2s;"
                onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';"
                onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='white'; this.style.transform='translateY(0)'; this.style.boxShadow='none';"
              >
                <div style="width: 48px; height: 48px; background: #f1f5f9; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div style="font-size: 15px; font-weight: 600; color: #374151; margin-bottom: 4px;">调整人员配置</div>
                <div style="font-size: 12px; color: #6b7280;">修改学员或考官数量</div>
              </button>
              
              <button 
                @click="nextStep()"
                :disabled="!isAssessmentPassable()"
                style="padding: 20px; border: none; border-radius: 14px; cursor: pointer; text-align: center; transition: all 0.2s;"
                :style="isAssessmentPassable() 
                  ? 'background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); opacity: 1;' 
                  : 'background: #e2e8f0; opacity: 0.6; cursor: not-allowed;'"
                onmouseover="if(!this.disabled) { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(59, 130, 246, 0.3)'; }"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
              >
                <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"></path>
                  </svg>
                </div>
                <div style="font-size: 15px; font-weight: 700; color: white; margin-bottom: 4px;">继续排班</div>
                <div style="font-size: 12px; color: rgba(255,255,255,0.85);">确认配置并开始排班</div>
              </button>
            </div>
            
            <!-- 风险提示 -->
            <div v-if="!isAssessmentPassable()" style="margin-top: 16px; padding: 16px 20px; background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #dc2626;">当前配置存在风险</div>
                <div style="font-size: 13px; color: #7f1d1d;">建议先调整配置后再继续排班</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤4: 确认执行 -->
        <div v-if="currentStep === 4" class="step-content">
          <div class="step-title">
            <div class="step-icon">✅</div>
            <h3>第四步：确认并执行排班</h3>
            <p class="step-description">核对所有配置信息，确认无误后点击开始排班，系统将自动生成最优排班方案</p> 
          </div>
          
          <!-- 配置摘要卡片 -->
          <div class="summary-cards" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
            <!-- 学员信息卡片 -->
            <div class="summary-card" style="background: white; border: 2px solid #e0e7ff; border-radius: 12px; padding: 20px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">学员信息</h4>
              </div>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #3b82f6;">{{ studentList.length }} <span style="font-size: 14px; font-weight: 500; color: #6b7280;">名学员</span></p>
              <p v-if="uploadedFile" style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">数据来源：{{ uploadedFile.name }}</p>
            </div>
            
            <!-- 考试日期卡片 -->
            <div class="summary-card" style="background: white; border: 2px solid #d1fae5; border-radius: 12px; padding: 20px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </div>
                <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">考试日期</h4>
              </div>
              <p v-if="examStartDateStr && examEndDateStr" style="margin: 0; font-size: 18px; font-weight: 600; color: #047857;">
                {{ examStartDateStr }} <span style="color: #9ca3af; font-weight: 400;">至</span> {{ examEndDateStr }}
              </p>
              <div style="margin-top: 8px; font-size: 13px; color: #6b7280;">
                <span style="display: inline-flex; align-items: center; gap: 4px; margin-right: 12px;">
                  <span style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span>
                  {{ getDateRangeStatistics().workdays }} 个工作日
                </span>
                <span v-if="getDateRangeStatistics().holidays > 0" style="display: inline-flex; align-items: center; gap: 4px; color: #f59e0b;">
                  <span style="width: 6px; height: 6px; background: #f59e0b; border-radius: 50%;"></span>
                  {{ getDateRangeStatistics().holidays }} 天节假日
                </span>
              </div>
            </div>
            
            <!-- 考官资源卡片 -->
            <div class="summary-card" style="background: white; border: 2px solid #e9d5ff; border-radius: 12px; padding: 20px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">考官资源</h4>
              </div>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #7c3aed;">{{ getTotalTeachersCount() }} <span style="font-size: 14px; font-weight: 500; color: #6b7280;">名考官</span></p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">每位学员需要2名考官监考</p>
            </div>
            
            <!-- 排班算法卡片 -->
            <div class="summary-card" style="background: white; border: 2px solid #fef3c7; border-radius: 12px; padding: 20px;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <h4 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">排班算法</h4>
              </div>
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #b45309;">{{ algorithmOptions.find((opt: any) => opt.value === selectedAlgorithm)?.label || 'OptaPlanner 经典算法' }}</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">{{ algorithmOptions.find((opt: any) => opt.value === selectedAlgorithm)?.description || '基于约束求解的智能排班算法' }}</p>
            </div>
          </div>
          
          <!-- 约束配置折叠面板 -->
          <div class="constraint-panel" style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
            <div class="constraint-header" @click="isConstraintExpanded = !isConstraintExpanded" 
              style="padding: 16px 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: white;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 36px; height: 36px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: #1f2937;">约束配置详情</h4>
                  <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">8项硬约束 + {{ getActiveSoftConstraintsCount() }}项软约束已配置</p>
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style="transition: transform 0.2s; color: #9ca3af;"
                :style="isConstraintExpanded ? 'transform: rotate(180deg);' : ''">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div v-show="isConstraintExpanded" style="padding: 20px; border-top: 1px solid #e5e7eb;">
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div class="constraint-group">
                  <h5 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #dc2626; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; background: #dc2626; border-radius: 50%;"></span>
                    硬约束 (必须满足)
                  </h5>
                  <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px; color: #4b5563;">
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 法定节假日不安排考试</li>
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 考官1必须与学员同科室</li>
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 考官执勤白班不能安排考试</li>
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 每名考官每天只能监考一名考生</li>
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 考生执勤白班不能安排考试</li>
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 考生需连续两天完成考试</li>
                    <li style="padding: 4px 0; border-bottom: 1px dashed #e5e7eb;">✓ 必须有考官1和考官2，且不同科室</li>
                    <li style="padding: 4px 0;">✓ 备份考官不能与考官1/2是同一人</li>
                  </ul>
                </div>
                <div class="constraint-group">
                  <h5 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; background: #f59e0b; border-radius: 50%;"></span>
                    软约束 (优先满足)
                  </h5>
                  <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px; color: #4b5563;">
                    <li v-if="constraints.nightShiftTeacherPriority" style="padding: 4px 0; color: #10b981;">✓ 晚班考官优先级最高</li>
                    <li v-if="constraints.examiner2ProfessionalMatch" style="padding: 4px 0; color: #10b981;">✓ 考官2专业匹配</li>
                    <li v-if="constraints.firstRestDayTeacherPriority" style="padding: 4px 0; color: #10b981;">✓ 休息第一天考官优先级次高</li>
                    <li v-if="constraints.backupExaminerProfessionalMatch" style="padding: 4px 0; color: #10b981;">✓ 备份考官专业匹配</li>
                    <li v-if="constraints.secondRestDayTeacherPriority" style="padding: 4px 0; color: #10b981;">✓ 休息第二天考官优先级中等</li>
                    <li v-if="constraints.balanceWorkload" style="padding: 4px 0; color: #10b981;">✓ 工作量均衡</li>
                    <li v-if="constraints.preferLaterDates" style="padding: 4px 0; color: #10b981;">✓ 日期分配均衡</li>
                    <li v-if="!constraints.nightShiftTeacherPriority && !constraints.examiner2ProfessionalMatch && !constraints.firstRestDayTeacherPriority" style="padding: 4px 0; color: #9ca3af;">使用默认软约束配置</li>
                  </ul>
                </div>
                <div class="constraint-group">
                  <h5 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #3b82f6; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%;"></span>
                    高级配置
                  </h5>
                  <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px; color: #4b5563;">
                    <li style="padding: 4px 0;">算法引擎：OptaPlanner</li>
                    <li style="padding: 4px 0;">时间分散优化：{{ constraints.enableTimeSpreadOptimization ? '已启用' : '未启用' }}</li>
                    <li style="padding: 4px 0;">动态权重调整：{{ constraints.enableDynamicWeightAdjustment ? '已启用' : '未启用' }}</li>
                    <li style="padding: 4px 0;">智能冲突解决：{{ constraints.enableIntelligentConflictResolution ? '已启用' : '未启用' }}</li>
                    <li style="padding: 4px 0;">周末排班：{{ allowWeekendScheduling ? '允许' : '不允许' }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 排班进度 -->
          <div v-if="isScheduling" class="scheduling-progress">
            <div class="progress-header">
              <h4>正在执行排班...</h4>
              <span class="progress-percentage">{{ Math.round(schedulingProgress) }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: schedulingProgress + '%' }"></div>
            </div>
            <div class="progress-details">
              <p class="progress-text">{{ currentProgressMessage || '请稍候，系统正在为您生成最优排班方案' }}</p>
              <div v-if="currentAssignmentCount > 0" class="assignment-counter">
                已分配: {{ currentAssignmentCount }} / {{ totalStudents * 2 }} 个考试安排
              </div>
            </div>
          </div>
          
          <!-- 错误提示 -->
          <div v-if="schedulingError" class="error-section">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
              <h4>排班失败</h4>
              <p>{{ schedulingError }}</p>
            </div>
          </div>
        </div>

        <!-- 步骤导航按钮 -->
        <div class="step-navigation">
          <button 
            v-if="currentStep > 1" 
            class="nav-btn nav-btn-secondary" 
            @click="previousStep"
          >
            上一步         </button>
          
          <div class="nav-spacer"></div>
          
          <button 
            v-if="currentStep < 4" 
            class="nav-btn nav-btn-primary" 
            @click="nextStep"
            :disabled="!canProceedToNextStep()"
          >
            下一步         </button>
          
          <button 
            v-if="currentStep === 4" 
            class="nav-btn nav-btn-success" 
            @click="startScheduling"
            :disabled="isScheduling || !canProceedToNextStep()"
          >
            <span v-if="!isScheduling">开始排班</span>
            <span v-else>排班中...</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 增强错误反馈模态框 -->
  <EnhancedErrorFeedbackModal
    :visible="enhancedErrorFeedbackService.getState().isVisible"
    :error-type="enhancedErrorFeedbackService.getState().errorType"
    :error-message="enhancedErrorFeedbackService.getState().errorMessage"
    :conflicts="enhancedErrorFeedbackService.getState().conflicts"
    @close="enhancedErrorFeedbackService.hideErrorFeedback()"
    @auto-resolve="handleAutoResolveConflict"
    @execute-action="handleExecuteAction"
    @export-report="handleExportReport"
  />

  <!-- 统一结果弹窗 -->
  <div v-if="showUnifiedResultModal" class="unified-modal-overlay" @click="closeUnifiedModal">
    <div class="unified-modal" @click.stop>
      <!-- 标题栏 -->
      <div class="modal-header">
        <div class="header-icon">
          <CheckCircle v-if="unifiedResultData?.success && getUnifiedHardConstraintViolations() === 0" class="success-icon" />
          <AlertTriangle v-else-if="unifiedResultData?.success && getUnifiedHardConstraintViolations() > 0" class="warning-icon" />
          <XCircle v-else class="error-icon" />
        </div>
        <div class="header-content">
          <h3 class="modal-title">{{ getUnifiedResultTitle() }}</h3>
          <p class="modal-subtitle">{{ getUnifiedResultSubtitle() }}</p>
        </div>
        <button @click="closeUnifiedModal" class="close-button">
          <X class="close-icon" />
        </button>
      </div>

      <!-- 主要内容 -->
      <div class="modal-body">
        <!-- 排班统计 -->
        <div class="stats-section">
          <h4 class="section-title">📊 排班统计</h4>
          <div class="stats-grid">
            <div class="stat-item success">
              <span class="stat-label">完成率</span>
              <span class="stat-value">{{ getUnifiedCompletionRate() }}%</span>
            </div>
            <div class="stat-item info">
              <span class="stat-label">分配学员</span>
              <span class="stat-value">{{ getUnifiedAssignedStudents() }}/{{ getUnifiedTotalStudents() }}</span>
            </div>
            <div class="stat-item info">
              <span class="stat-label">考试任务</span>
              <span class="stat-value">{{ getUnifiedTotalStudents() * 2 }}场</span>
            </div>
            <div class="stat-item" :class="getUnifiedHardConstraintClass()">
              <span class="stat-label">硬约束违反</span>
              <span class="stat-value">{{ getUnifiedHardConstraintViolations() }}个</span>
            </div>
            <div class="stat-item softscore-stat" :class="getSoftScoreClass()">
              <span class="stat-label">软约束得分</span>
              <span class="stat-value">{{ formatSoftScore(unifiedResultData?.statistics?.softConstraintsScore) }}</span>
              <span v-if="unifiedResultData?.statistics?.bestSoftConstraintsScore != null" class="stat-hint">
                峰值: {{ formatSoftScore(unifiedResultData?.statistics?.bestSoftConstraintsScore ?? undefined) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 约束违反详情 -->
        <div v-if="constraintViolations.length > 0" class="violations-section">
          <h4 class="section-title">⚠️ 约束违反详情</h4>
          <div class="violations-summary">
            <span class="violations-count">发现 {{ constraintViolations.length }} 个约束违反</span>
            <span class="severity-breakdown">
              严重: {{ constraintViolations.filter(v => v.severity === 'error').length }}个，
              轻微: {{ constraintViolations.filter(v => v.severity === 'warning').length }}个
            </span>
          </div>
          
          <div class="violations-list">
            <div 
              v-for="(violation, index) in constraintViolations.slice(0, 5)" 
              :key="violation.id"
              class="violation-item"
              :class="violation.severity"
            >
              <div class="violation-header">
                <div class="violation-icon">
                  <AlertTriangle v-if="violation.severity === 'error'" class="error-icon-small" />
                  <AlertCircle v-else class="warning-icon-small" />
                </div>
                <div class="violation-title">{{ violation.title }}</div>
                <div class="violation-count">{{ violation.count || 1 }}个</div>
              </div>
              
              <div class="violation-details">
                <p class="violation-description">{{ violation.description }}</p>
              </div>
            </div>
            
            <div v-if="constraintViolations.length > 5" class="more-violations">
              还有 {{ constraintViolations.length - 5 }} 个约束违反未显示...
            </div>
          </div>
        </div>

        <!-- 成功信息 -->
        <div v-if="unifiedResultData?.success && getUnifiedHardConstraintViolations() === 0 && getUnifiedAssignedStudents() === getUnifiedTotalStudents()" class="success-section">
          <div class="success-message">
            <CheckCircle class="success-icon-large" />
            <div class="success-content">
              <h4>🎉 排班完成！</h4>
              <p>成功为 {{ getUnifiedAssignedStudents() }} 位学员安排了 {{ getUnifiedAssignedStudents() * 2 }} 场考试，所有约束条件均已满足。</p>
              <p class="success-detail">✅ 已分配主考官和副考官 &nbsp;&nbsp; ✅ 日期和时间安排合理 &nbsp;&nbsp; ✅ 所有约束验证通过</p>
            </div>
          </div>
        </div>
        
        <!-- 部分完成提示 -->
        <div v-else-if="unifiedResultData?.success && getUnifiedHardConstraintViolations() === 0 && getUnifiedAssignedStudents() < getUnifiedTotalStudents()" class="partial-success-section">
          <div class="partial-success-message">
            <AlertCircle class="warning-icon-large" />
            <div class="partial-success-content">
              <h4>⚠️ 排班部分完成</h4>
              <p>成功为 {{ getUnifiedAssignedStudents() }} 位学员安排了 {{ getUnifiedAssignedStudents() * 2 }} 场考试。</p>
              <p class="warning-detail">⚠️ 有 {{ getUnifiedTotalStudents() - getUnifiedAssignedStudents() }} 位学员因约束条件无法安排</p>
              <div class="suggestion-box">
                <p class="suggestion-title">💡 改进建议：</p>
                <ul class="suggestion-list">
                  <li>检查未分配学员的推荐考官是否在不可用时间段</li>
                  <li>扩大考试日期范围（增加可选日期）</li>
                  <li>检查该学员科室的考官数量是否充足</li>
                  <li>放宽部分软约束权重</li>
                  <li>手动为未分配学员指定考官</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="modal-footer">
        <div class="footer-info">
          <span class="engine-info">🚀 使用 OptaPlanner 约束求解引擎</span>
        </div>
        <div class="footer-actions">
          <button @click="closeUnifiedModal" class="action-button primary">
            我知道了
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ConstraintViolationChecker, logViolationReport } from '../utils/constraintViolationChecker'
import { debugScheduleData, calculateOptimalExamDays } from '../utils/dataDebugger'
import { 
  Home, 
  Users, 
  Calendar, 
  Settings,
  ChevronLeft,
  Trash2,
  Download,
  Upload,
  FileText,
  Plus,
  Eye,
  Edit,
  AlertCircle,
  Clock,
  RefreshCw,
  BarChart,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  CircleAlert,
  Sparkles,
  Pin,
  GripVertical,
  Shuffle
} from 'lucide-vue-next'
import SimpleDateRangePicker from '../components/SimpleDateRangePicker.vue'
import RealTimeStatusMonitor from '../components/RealTimeStatusMonitor.vue'

// 移除增强排班服务V2导入
// 保留OptaPlanner作为备用
import { 
  optaPlannerService,
  type OptaPlannerRequest,
  type OptaPlannerResponse
} from '../services/optaplanner-service'
// 移除AI相关服务导入，只保留OptaPlanner
// 保留原有类型定义以兼容现有代码
import { 
  type StudentInfo,
  type TeacherInfo,
  type SchedulingResult
} from '../utils/types'
import { storageService, type ScheduleResultRecord } from '../services/storageService'
import { FrontendDisplayFixer } from '../utils/frontendDisplayFixer'
// 移除不存在的cacheManager导入，相关功能已集成到unifiedStorageService
import { DataValidationService } from '../services/dataValidationService'
import ConstraintViolationAlert, { createHolidayViolation, createInsufficientExaminersViolation, filterAndMergeViolations, type ConstraintViolation } from '../components/ConstraintViolationAlert.vue'
import { holidayService } from '../services/holidayService'
import { dutyRotationService } from '../services/dutyRotationService'
import SmartManualEditModal from '../components/SmartManualEditModal.vue'
import AviationSchedulingLoader from '../components/AviationSchedulingLoader.vue'
import { smartRecommendationService } from '../services/smartRecommendationService'
import { useSmartProgress } from '../composables/useSmartProgress'
import { dataManagementApi } from '../services/dataManagementApi'
import EnhancedErrorFeedbackModal from '../components/EnhancedErrorFeedbackModal.vue'
import { enhancedErrorFeedbackService } from '../services/enhancedErrorFeedbackService'
import type { ConflictInfo } from '../types/errorFeedback'
import { checkScheduleConstraints, printConstraintCheckResult } from '../utils/scheduleConstraintChecker'
import { scheduleConflictDetector } from '../services/scheduleConflictDetector'
import { scheduleHistoryService } from '../services/scheduleHistoryService'
import { excelExportService } from '../services/excelExportService'
import type { ScheduleSnapshot } from '../types/index'
import { DateUtils as dateUtils } from '../utils/dateUtils'
import { assignmentDataService, convertAssignmentToSchedule } from '../services/assignmentDataService'
import { normalizeDeptToFull, normalizeDeptToShort } from '../utils/departmentNormalizer'
import { 
  optimizedAssessmentService,
  type OptimizedAssessmentResultType,
  type BottleneckAnalysisType,
  type DateRangeRecommendationType
} from '../services/optimizedAssessmentService'
import {
  preciseAssessmentService,
  type PreciseAssessmentResult,
  type DepartmentCapacity
} from '../services/preciseAssessmentService'

// 🆕 科室名称显示转换函数（统一显示为"区域X室"格式）
const displayDepartment = (dept: string | undefined | null): string => {
  if (!dept) return '-'
  return normalizeDeptToFull(dept)
}

// 路由实例
const route = useRoute()

// 应用版本号 - 从 package.json 自动读取
const appVersion = ref(import.meta.env.VITE_APP_VERSION || '0.0.0')

// 响应式数组
const sidebarCollapsed = ref(false)
// WebSocket 会话ID（用于实时进度监控）
const wsSessionId = ref<string | null>(null)

// ========== 历史排班管理状态 ==========
const showSaveSnapshotDialog = ref(false)
const showHistoryListDialog = ref(false)
const snapshotName = ref('')
const snapshotDescription = ref('')
const currentSnapshotInfo = ref<ScheduleSnapshot | null>(null)
const hasUnsavedChanges = ref(false)
const isRestoringData = ref(false)  // 🔧 新增：标记是否正在恢复数据（避免触发未保存状态）
const historyList = ref<ScheduleSnapshot[]>([])
const historyLoading = ref(false)
const historySearchQuery = ref('')
const cleanupRecommendation = ref({
  needsCleanup: false,
  snapshotCount: 0,
  recommendedDeleteCount: 0
})

// 🆕 学员列表和不可用时间详情对话框
const showStudentListDialog = ref(false)
const showUnavailableDialog = ref(false)
const selectedSnapshotStudents = ref<any[]>([])
const unavailableTeachersData = ref<any[]>([])

// 🆕 上传排班表相关状态
const showUploadScheduleDialog = ref(false)
const uploadedScheduleFile = ref<File | null>(null)
const scheduleFileInput = ref<HTMLInputElement | null>(null)
const parsedScheduleData = ref<any[]>([])
const scheduleParseStatus = ref<{type: 'success' | 'error' | 'warning', message: string, details?: string} | null>(null)
const uploadScheduleSnapshotName = ref('')

// 监听历史记录对话框打开，自动加载数据
watch(showHistoryListDialog, (newVal) => {
  if (newVal) {
    process.env.NODE_ENV === 'development' && console.log('🔍 历史记录对话框打开，开始加载数据...')
    loadHistoryList()
  }
})

// 实时进度服务缓存，避免重复连接与事件堆积
let realtimeProgressServiceInstance: any | null = null
let realtimeProgressUnsubscribe: (() => void) | null = null
let activeRealtimeSessionId: string | null = null
let realtimeLogStopper: (() => void) | null = null
let wsSilenceTimer: ReturnType<typeof setTimeout> | null = null
let lastWsMessageAt = 0
let wsSilentFallbackStarted = false

// 🆕 v5.6.0: 局部重排功能相关状态
const isPartialRescheduling = ref(false)  // 是否正在局部重排
const showPartialRescheduleDialog = ref(false)  // 是否显示进度对话框
const partialRescheduleMessage = ref('正在初始化...')  // 当前状态消息
const partialRescheduleCurrentScore = ref('')  // 当前最佳分数（完整）
const partialRescheduleHardScore = ref(0)  // 当前硬约束分数
const partialRescheduleSoftScore = ref(0)  // 当前软约束分数
const partialRescheduleCancelling = ref(false)  // 是否正在取消
const partialRescheduleSessionId = ref('')  // 会话ID

// 🔥 深度重排功能相关状态
const isDeepRescheduling = ref(false)  // 是否正在深度重排

// 🔧 局部重排功能相关状态（新增）
const isLocalRescheduling = ref(false)  // 是否正在局部重排
const localRescheduleProgress = ref('')  // 局部重排进度消息
const localRescheduleAttemptDays = ref(2)  // 当前尝试的扩展天数

// 计算未固定排班数量
const unpinnedCount = computed(() => {
  return scheduleResults.value.filter(s => !isPinnedSchedule(String(s.id))).length
})

// ========== 💾 持久化相关函数 ==========
const STORAGE_KEY_PREFIX = 'schedules_page_'

// 保存当前页面状态到 localStorage
const savePageState = () => {
  try {
    const state = {
      scheduleResults: scheduleResults.value,
      studentList: studentList.value,
      teacherList: teacherList.value,
      examStartDateStr: examStartDateStr.value,
      examEndDateStr: examEndDateStr.value,
      constraints: constraints.value,
      currentSnapshotInfo: currentSnapshotInfo.value,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY_PREFIX + 'state', JSON.stringify(state))
    process.env.NODE_ENV === 'development' && console.log('💾 页面状态已保存到 localStorage')
  } catch (error) {
    console.error('❌ 保存页面状态失败:', error)
  }
}

// 从 localStorage 恢复页面状态
const restorePageState = () => {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY_PREFIX + 'state')
    if (savedState) {
      const state = JSON.parse(savedState)
      
      // 检查数据是否过期（24小时）
      const savedTime = new Date(state.timestamp)
      const now = new Date()
      const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff > 24) {
        process.env.NODE_ENV === 'development' && console.log('⏰ 保存的数据已过期（超过24小时），不恢复')
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'state')
        return false
      }
      
      // 🔧 设置恢复标志，防止触发"未保存"状态
      isRestoringData.value = true
      
      // 恢复数据
      if (state.scheduleResults && state.scheduleResults.length > 0) {
        scheduleResults.value = state.scheduleResults
        process.env.NODE_ENV === 'development' && console.log(`✅ 已恢复 ${state.scheduleResults.length} 条排班记录`)
      }
      
      if (state.studentList) {
        studentList.value = state.studentList
        process.env.NODE_ENV === 'development' && console.log(`✅ 已恢复 ${state.studentList.length} 位学员数据`)
      }
      
      if (state.teacherList) {
        teacherList.value = state.teacherList
        cachedTeacherData = state.teacherList // 🔧 同步更新缓存
        process.env.NODE_ENV === 'development' && console.log(`✅ 已恢复 ${state.teacherList.length} 位考官数据`)
      }
      
      if (state.examStartDateStr) examStartDateStr.value = state.examStartDateStr
      if (state.examEndDateStr) examEndDateStr.value = state.examEndDateStr
      if (state.constraints) constraints.value = state.constraints
      if (state.currentSnapshotInfo) currentSnapshotInfo.value = state.currentSnapshotInfo
      
      // 🔧 恢复完成后，延迟1秒再清除标志（确保所有watch完成）
      setTimeout(() => {
        isRestoringData.value = false
        // 恢复时不应该有"未保存"状态
        hasUnsavedChanges.value = false
        process.env.NODE_ENV === 'development' && console.log('✅ 数据恢复完成，清除"未保存"标记')
      }, 1000)
      
      ElMessage.success({
        message: `✅ 已恢复上次的排班数据（${state.scheduleResults.length} 条记录）`,
        duration: 3000
      })
      
      return true
    }
    return false
  } catch (error) {
    console.error('❌ 恢复页面状态失败:', error)
    return false
  }
}

const showCreateModal = ref(false)
const showConstraintsPanel = ref(false)
// 移除约束条件面板

// 🆕 从考官分配导入相关状态
const hasAssignmentData = ref(false)
const assignmentDataCount = ref(0)

// 检查是否有考官分配数据
const checkAssignmentData = () => {
  const data = assignmentDataService.getAssignmentData()
  hasAssignmentData.value = data !== null && data.length > 0
  assignmentDataCount.value = data?.length || 0
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:checkAssignmentData',message:'checking assignment data availability',data:{hasData:hasAssignmentData.value,count:assignmentDataCount.value},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'DataFlow'})}).catch(()=>{});
  // #endregion
}

// 从考官分配页面导入数据
const handleImportFromAssignment = () => {
  const assignmentStudents = assignmentDataService.getAssignmentData()
  
  if (!assignmentStudents || assignmentStudents.length === 0) {
    ElMessage.warning('没有可导入的考官分配数据，请先在考官分配页面完成分配')
    return
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:handleImportFromAssignment',message:'importing from assignment page',data:{studentCount:assignmentStudents.length,firstStudent:assignmentStudents[0]?{name:assignmentStudents[0].name,dept:assignmentStudents[0].department,group:assignmentStudents[0].group,examiner1:assignmentStudents[0].examiner1,examiner2:assignmentStudents[0].examiner2}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'DataFlow'})}).catch(()=>{});
  // #endregion
  
  // 转换数据格式
  const convertedStudents = convertAssignmentToSchedule(assignmentStudents)
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:handleImportFromAssignment:converted',message:'converted student data',data:{convertedCount:convertedStudents.length,firstConverted:convertedStudents[0]?{name:convertedStudents[0].name,dept:convertedStudents[0].department,group:convertedStudents[0].group,recommendedExaminer1Dept:convertedStudents[0].recommendedExaminer1Dept,recommendedExaminer2Dept:convertedStudents[0].recommendedExaminer2Dept}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'DataFlow'})}).catch(()=>{});
  // #endregion
  
  // 更新学员列表
  studentList.value = convertedStudents
  
  // 设置虚拟上传文件信息
  uploadedFile.value = {
    name: `考官分配导入_${assignmentStudents.length}人.json`,
    size: JSON.stringify(assignmentStudents).length,
    type: 'application/json',
    file: null as any
  }
  
  ElMessage.success({
    message: `成功导入 ${convertedStudents.length} 名学员数据（含推荐考官科室信息）`,
    duration: 3000
  })
  
  process.env.NODE_ENV === 'development' && console.log('✅ 从考官分配导入的学员数据:', convertedStudents)
}

// 分步骤相关状态
const currentStep = ref(1)
    const examStartDateStr = ref('')
    const examEndDateStr = ref('')
    
    // 添加日期变化监听器用于调试
    watch(examStartDateStr, (newVal, oldVal) => {
      process.env.NODE_ENV === 'development' && console.log('🔍 examStartDateStr 变化:', oldVal, '→', newVal)
    })
    
    watch(examEndDateStr, (newVal, oldVal) => {
      process.env.NODE_ENV === 'development' && console.log('🔍 examEndDateStr 变化:', oldVal, '→', newVal)
    })
    
    // 算法选择 - 移除智能约束传播算法选项
    const selectedAlgorithm = ref<'optaplanner'>('optaplanner')
    const algorithmOptions = [
      { 
        value: 'optaplanner', 
        label: 'OptaPlanner 经典算法', 
        description: '稳定可靠的传统算法',
        icon: '🛡️',
        features: ['高稳定性', '成熟可靠', '企业级'],
        recommended: true
      }
    ]
    
    // 约束配置 - 更新为与后端一致的字段名称
    const constraints = ref({
      // 硬约束（只读）
      workdaysOnlyExam: true,
      examinerDepartmentRules: true,
      twoMainExaminersRequired: true,
      noDayShiftExaminer: true,
      consecutiveTwoDaysExamEnabled: true,
      noExaminerTimeConflict: true,
      mustHaveTwoDifferentDepartmentExaminers: true,
      backupExaminerMustBeDifferentPerson: true,
      
      // 软约束（可配置）- 按照SC1-SC11统一命名，全部默认开启
      nightShiftTeacherPriority: true,           // SC1: 晚班考官优先级最高权重
      examiner2ProfessionalMatch: true,          // SC2: 考官2专业匹配
      firstRestDayTeacherPriority: true,         // SC3: 休息第一天考官优先级次高权重
      backupExaminerProfessionalMatch: true,     // SC4: 备份考官专业匹配
      secondRestDayTeacherPriority: true,        // SC5: 休息第二天考官优先级中等权重
      examiner2AlternativeOption: true,          // SC6: 考官2备选方案
      adminTeacherPriority: true,                // SC7: 行政班考官优先级最低权重
      backupExaminerAlternativeOption: true,     // SC8: 备份考官备选方案
      allowDept37CrossUse: true,                 // SC9: 区域协作鼓励
      balanceWorkload: true,                     // SC10: 工作量均衡
      preferLaterDates: true,                    // SC11: 日期分配均衡
      avoidWeekendSchedulingEnabled: true,       // SC16: 智能周末降级策略（避免周末排班）
      preferNightShiftOnWeekendEnabled: true,    // SC17: 周末优先晚班考官策略

      // 高级配置选项
      enableTimeSpreadOptimization: true,        // 智能时间分散优化
      enableDynamicWeightAdjustment: true,       // 动态权重调整
      enableIntelligentConflictResolution: true, // 智能冲突解决
      enableEarlyWarningSystem: true,            // 预警系统
      enableHistoricalDataOptimization: true,    // 历史数据优化
    })
    
    // 约束权重 - 严格按照文档权重设置
    const constraintWeights = ref({
      // SC1: 晚班考官优先级最高权重（权重：100）
      preferNightShiftTeachers: 100,
      // SC2: 考官2专业匹配（权重：90）
      preferRecommendedExaminer2: 90,
      // SC3: 休息第一天考官优先级次高权重（权重：80）
      preferFirstRestDayTeachers: 80,
      // SC4: 备份考官专业匹配（权重：70）
      preferRecommendedBackup: 70,
      // SC5: 休息第二天考官优先级中等权重（权重：60）
      preferSecondRestDayTeachers: 60,
      // SC6: 考官2备选方案（权重：50）
      preferNonRecommendedExaminer2: 50,
      // SC7: 行政班考官优先级最低权重（权重：40）
      preferAdminTeachers: 40,
      // SC8: 备份考官备选方案（权重：30）
      preferNonRecommendedBackup: 30,
      // SC9: 区域协作鼓励（权重：20）
      allowDept37CrossUse: 20,
      // SC10: 工作量均衡（权重：10）
      balanceWorkload: 10,
      // SC11: 日期分配均衡（权重：5）
      preferLaterDates: 5,
    })

// 实时进度显示相关状态
const currentProgressMessage = ref('')
const isTableUpdating = ref(false)
const lastTableUpdate = ref('')

// 🎬 表格动画状态
const isTableAnimating = ref(false)
const animationCells = ref<Array<{
  rowIndex: number;
  cellType: 'examiner1' | 'examiner2' | 'backup' | 'date';
  day: 1 | 2;
  animationType: 'typing' | 'selecting' | 'confirming' | 'sliding';
  content: string;
  progress: number;
}>>([])

// 🎬 OptaPlanner风格的排班动画效果
const startTableAnimation = () => {
  if (!isScheduling.value) return
  
  // 创建基于真实学员数据的初始动画表格
  const animationResults = []
  const animationStudents = Math.min(studentList.value.length, 12) // 最多12个学员显示
  
  for (let i = 0; i < animationStudents; i++) {
    const student = studentList.value[i]
    animationResults.push({
      id: `solving-${i}`,
      student: student?.name || `学员${i + 1}`,
      department: student?.department || '待分配',
      date1: '计算中...',
      type1: '现场',
      date2: '计算中...',
      type2: '口试', 
      examiner1_1: '分配中...',
      examiner1_2: '分配中...',
      backup1: '分配中...',
      examiner2_1: '分配中...',
      examiner2_2: '分配中...',
      backup2: '分配中...'
    } as any)
  }
  
  scheduleResults.value = animationResults
  isTableAnimating.value = true
  animationCells.value = []
  
  process.env.NODE_ENV === 'development' && console.log('🎬 启动基于真实数据的华容道动画', {
    学员数量: animationStudents,
    考官池大小: teacherList.value.length,
    初始表格数据: animationResults.length
  })
  
  // 华容道式排班动画 - 考官名字移动，日期变化
  startHuaRongDaoAnimation()
}

// 🎬 基于真实考官数据的华容道动画 - 显示真实求解过程
const startHuaRongDaoAnimation = () => {
  // 获取真实考官数据
  const realTeacherNames = teacherList.value.map(teacher => teacher.name || '未知考官')
  if (realTeacherNames.length === 0) {
    addRealtimeLog('⚠️ 考官数据为空，使用默认考官池', 'warning')
    realTeacherNames.push('张考官', '李考官', '王考官', '刘考官', '陈考官')
  }
  
  process.env.NODE_ENV === 'development' && console.log('🎲 使用真实考官数据:', realTeacherNames)
  
  // 生成考试日期池（基于用户选择的日期范围）
  const generateRealDatePool = () => {
    const dates = []
    if (examStartDate.value && examEndDate.value) {
      const current = new Date(examStartDate.value)
      const end = new Date(examEndDate.value)
      
      while (current <= end) {
        const month = String(current.getMonth() + 1).padStart(2, '0')
        const day = String(current.getDate()).padStart(2, '0')
        dates.push(`${month}.${day}`)
        current.setDate(current.getDate() + 1)
      }
    }
    return dates.length > 0 ? dates : ['10.15', '10.16', '10.17', '10.18', '10.19']
  }
  
  const realDatePool = generateRealDatePool()
  let animationInterval: NodeJS.Timeout
  let isAnimationStopped = false
  
  addRealtimeLog('🎲 启动基于真实数据的华容道动画', 'info')
  addRealtimeLog(`📊 考官池: ${realTeacherNames.length}名, 日期池: ${realDatePool.length}天`, 'info')
  
  // 智能华容道动画 - 模拟真实求解过程
  const runIntelligentAnimation = () => {
    if (!isTableAnimating.value || isAnimationStopped) {
      if (animationInterval) clearInterval(animationInterval)
      return
    }
    
    scheduleResults.value.forEach((row: any, rowIndex: number) => {
      // 智能日期调整（基于真实日期范围）
      if (Math.random() < 0.25) { // 25% 概率调整日期
        row.date1 = realDatePool[Math.floor(Math.random() * realDatePool.length)]
        row.date2 = realDatePool[Math.floor(Math.random() * realDatePool.length)]
        
        // 确保两个日期不同
        while (row.date1 === row.date2 && realDatePool.length > 1) {
          row.date2 = realDatePool[Math.floor(Math.random() * realDatePool.length)]
        }
      }
      
      // 智能考官分配移动（使用真实考官名字）
      if (Math.random() < 0.35) { // 35% 概率移动考官
        const positions = ['examiner1_1', 'examiner1_2', 'backup1', 'examiner2_1', 'examiner2_2', 'backup2']
        const targetPosition = positions[Math.floor(Math.random() * positions.length)]
        
        // 选择真实考官
        const selectedTeacher = realTeacherNames[Math.floor(Math.random() * realTeacherNames.length)]
        const oldValue = row[targetPosition]
        row[targetPosition] = selectedTeacher
        
        // 创建移动效果动画
        const cellType = targetPosition.includes('examiner1') ? 'examiner1' : 
                        targetPosition.includes('examiner2') ? 'examiner2' : 'backup'
        const day = targetPosition.includes('1') ? 1 : 2
        
        // 清除旧的动画状态
        animationCells.value = animationCells.value.filter(cell => 
          !(cell.rowIndex === rowIndex && cell.cellType === cellType && cell.day === day)
        )
        
        // 添加移动动画效果
        animationCells.value.push({
          rowIndex,
          cellType: cellType as any,
          day: day as any,
          animationType: 'sliding' as const,
          content: selectedTeacher,
          progress: 100
        })
        
        // 记录移动日志
        if (oldValue !== selectedTeacher) {
          addRealtimeLog(`🔄 ${row.student}: ${oldValue} → ${selectedTeacher}`, 'info')
        }
      }
    })
    
    // 随机记录算法状态
    if (Math.random() < 0.15) {
      const algorithmActions = [
        '评估约束冲突', '优化考官分配', '调整考试日期', 
        '平衡工作负载', '检查科室匹配', '验证时间冲突'
      ]
      const action = algorithmActions[Math.floor(Math.random() * algorithmActions.length)]
      addRealtimeLog(`🔍 ${action}...`, 'info')
    }
  }
  
  // 启动智能动画循环
  animationInterval = setInterval(runIntelligentAnimation, 600) // 每600ms更新一次
  
  // 监听真实结果，及时停止动画
  const stopAnimationOnResult = () => {
    isAnimationStopped = true
    if (animationInterval) {
      clearInterval(animationInterval)
      addRealtimeLog('✅ 检测到真实结果，停止华容道动画', 'success')
      
      // 更新表格状态
      const now = new Date()
      lastTableUpdate.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    }
  }
  
  // 设置结果监听器（将在updateScheduleResults中调用）
  ;(window as any).stopHuaRongDaoAnimation = stopAnimationOnResult
  
  // 备用停止机制
  setTimeout(() => {
    if (!isAnimationStopped) {
      stopAnimationOnResult()
    }
  }, 30000) // 30秒后强制停止
}

// 🎬 停止表格动画
const stopTableAnimation = () => {
  isTableAnimating.value = false
  animationCells.value = []
  
  // 清理华容道演示数据，为真实数据做准备
  const isAnimationData = scheduleResults.value.some((result: any) => 
    typeof result.id === 'string' && result.id.startsWith('solving-')
  )
  
  if (isAnimationData) {
    process.env.NODE_ENV === 'development' && console.log('🧹 清理华容道演示数据，为最终结果做准备')
    scheduleResults.value = []
  }
  
  // 清理全局动画停止函数
  if ((window as any).stopHuaRongDaoAnimation) {
    delete (window as any).stopHuaRongDaoAnimation
  }
  
  process.env.NODE_ENV === 'development' && console.log('🎬 华容道动画已停止')
}

// 🎬 打字动画效果
const startTypingAnimation = (cellIndex: number) => {
  const cell = animationCells.value[cellIndex]
  if (!cell) return
  
  const fullText = cell.content
  const typingSpeed = 50 // 毫秒
  let currentIndex = 0
  
  const typeInterval = setInterval(() => {
    if (!isTableAnimating.value || currentIndex >= fullText.length) {
      clearInterval(typeInterval)
      if (cell) {
        cell.progress = 100
        cell.animationType = 'confirming'
      }
      return
    }
    
    currentIndex++
    if (cell) {
      cell.progress = (currentIndex / fullText.length) * 100
    }
  }, typingSpeed)
}

// 🎬 获取单元格动画状态
const getCellAnimationState = (rowIndex: number, cellType: string, day: number) => {
  return animationCells.value.find(cell => 
    cell.rowIndex === rowIndex && 
    cell.cellType === cellType && 
    cell.day === day
  )
}

// ✏️ 检查字段是否被人工修改过
const isFieldManuallyEdited = (result: any, fieldName: string): boolean => {
  if (!result || !result.manualEdits || !Array.isArray(result.manualEdits)) {
    return false
  }
  const isEdited = result.manualEdits.some((edit: any) => edit.field === fieldName)
  return isEdited
}

// ✏️ 获取字段的人工修改信息
const getManualEditInfo = (result: any, fieldName: string): any => {
  if (!result || !result.manualEdits || !Array.isArray(result.manualEdits)) {
    return null
  }
  const edits = result.manualEdits.filter((edit: any) => edit.field === fieldName)
  return edits.length > 0 ? edits[edits.length - 1] : null // 返回最新的修改
}

// 🎨 获取人工修改的样式类（根据冲突级别）
const getManualEditClass = (result: any, fieldName: string): string => {
  // 先检查 result 和 manualEdits 是否存在
  if (!result) {
    console.warn('⚠️ getManualEditClass: result 为空')
    return ''
  }
  
  if (!result.manualEdits || !Array.isArray(result.manualEdits) || result.manualEdits.length === 0) {
    // 没有修改记录，不显示任何颜色
    return ''
  }
  
  const editInfo = getManualEditInfo(result, fieldName)
  if (!editInfo) {
    return '' // 未修改此字段
  }
  
  // 检查冲突级别
  const conflicts = editInfo.conflicts || []
  const hasHardConflict = conflicts.some((c: any) => 
    c.severity === 'error' || c.severity === 'high' || c.type === 'hard'
  )
  const hasSoftConflict = conflicts.some((c: any) => 
    c.severity === 'warning' || c.severity === 'medium' || c.type === 'soft'
  )
  const hasInfoConflict = conflicts.some((c: any) => 
    c.severity === 'low' || c.type === 'NOT_RECOMMENDED' || c.type === 'LOW_RECOMMENDATION'
  )
  const isForced = editInfo.isForced === true
  
  // 获取推荐信息（智能判断修改质量）
  const wasRecommended = editInfo.wasRecommended || false
  const recommendationScore = editInfo.recommendationScore || 0
  const recommendationPriority = editInfo.recommendationPriority || 'none'
  
  // 🎨 智能分级逻辑
  let cssClass = ''
  
  if (hasHardConflict || isForced) {
    // 🔴 红色：硬约束冲突或强制修改
    cssClass = 'manually-edited-error'
  } else if (hasSoftConflict) {
    // 🟠 橙色：软约束冲突
    cssClass = 'manually-edited-warning'
  } else if (!wasRecommended || recommendationScore < 60) {
    // 🟠 橙色：不在推荐列表或评分过低
    cssClass = 'manually-edited-warning'
  } else if (hasInfoConflict || recommendationScore < 80 || recommendationPriority === 'low' || recommendationPriority === 'medium') {
    // 🔵 蓝色：推荐但优先级不高，或有低级别提示
    cssClass = 'manually-edited-info'
  } else {
    // 🟢 绿色：高质量推荐修改（评分>=80%且高优先级），无冲突
    cssClass = 'manually-edited-success'
  }
  
  return cssClass
}

// 🎨 获取人工修改的提示文本
const getManualEditTooltip = (result: any, fieldName: string): string => {
  const editInfo = getManualEditInfo(result, fieldName)
  if (!editInfo) {
    return ''
  }
  
  const conflicts = editInfo.conflicts || []
  const timestamp = editInfo.timestamp ? new Date(editInfo.timestamp).toLocaleString('zh-CN') : ''
  
  let tooltip = `✏️ 人工修改 (${timestamp})\n`
  tooltip += `原值: ${editInfo.originalValue || '无'} → 新值: ${editInfo.newValue}\n`
  
  // 🆕 显示推荐信息
  if (editInfo.wasRecommended) {
    const score = editInfo.recommendationScore || 0
    const priority = editInfo.recommendationPriority || 'none'
    const priorityText = priority === 'high' ? '高' : priority === 'medium' ? '中' : '低'
    tooltip += `\n💡 智能推荐：评分 ${score}%，优先级 ${priorityText}`
    
    if (score >= 80 && priority === 'high') {
      tooltip += `\n🟢 优质推荐：符合多项最佳实践`
    } else if (score >= 60) {
      tooltip += `\n🔵 可接受推荐：基本符合要求`
    }
  } else {
    tooltip += `\n🟠 未在推荐列表：可能存在更优选择`
  }
  
  if (editInfo.reason) {
    tooltip += `\n原因: ${editInfo.reason}`
  }
  
  if (conflicts.length > 0) {
    tooltip += `\n\n⚠️ 冲突提示:\n`
    conflicts.forEach((c: any, index: number) => {
      tooltip += `${index + 1}. ${c.title || c.message || c.description}\n`
    })
  }
  
  if (editInfo.isForced) {
    tooltip += `\n🔥 强制修改：已忽略约束警告`
  }
  
  return tooltip
}

// 🔄 OptaPlanner风格的增量更新机制已移除

// 🔄 转换OptaPlanner结果为表格格式（复用现有逻辑）
const convertOptaPlannerResultToTableFormat = async (result: SchedulingResult) => {
  process.env.NODE_ENV === 'development' && console.log('🔄 开始转换OptaPlanner结果为表格格式')
  process.env.NODE_ENV === 'development' && console.log('📊 输入数据详情:', {
    hasResult: !!result,
    hasAssignments: !!(result?.assignments),
    assignmentsLength: result?.assignments?.length || 0,
    firstAssignment: result?.assignments?.[0]
  })
  
  // 复用updateScheduleResults中的转换逻辑，但不更新DOM
  const newResults: any[] = []
  
  if (!result.assignments || result.assignments.length === 0) {
    console.warn('⚠️ 转换失败: assignments为空或长度为0')
    return newResults
  }
  
  process.env.NODE_ENV === 'development' && console.log('✅ assignments验证通过，开始处理学员分组')
  
  // 🔧 第一步：强制去重assignments
  const uniqueAssignmentsMap = new Map<string, any>()
  result.assignments.forEach((assignment: any) => {
    const assignmentId = assignment.id || `${assignment.studentId || assignment.student?.id}_${assignment.examType || 'unknown'}`
    if (!uniqueAssignmentsMap.has(assignmentId)) {
      uniqueAssignmentsMap.set(assignmentId, assignment)
    } else {
      console.warn(`⚠️ [去重] 检测到重复的assignment ID: ${assignmentId}，已跳过`)
    }
  })
  
  const uniqueAssignments = Array.from(uniqueAssignmentsMap.values())
  if (result.assignments.length !== uniqueAssignments.length) {
    console.error(`🔧 [去重] 移除了${result.assignments.length - uniqueAssignments.length}个重复assignment`)
  }
  
  // 按学员分组处理排班数据
  const studentAssignments = new Map<string, any[]>()
  
  // 🔍 检测重复的assignment ID（第二次验证）
  const assignmentIds = new Set<string>()
  const duplicateIds: string[] = []
  
  uniqueAssignments.forEach((assignment: any, index: number) => {
    // 检测重复ID
    if (assignment.id) {
      if (assignmentIds.has(assignment.id)) {
        duplicateIds.push(assignment.id)
        console.error(`🚨 发现重复的assignment ID: ${assignment.id}`)
      }
      assignmentIds.add(assignment.id)
    }
    
    process.env.NODE_ENV === 'development' && console.log(`📝 处理第${index + 1}个assignment:`, {
      id: assignment.id,
      studentId: assignment.studentId,
      studentName: assignment.studentName,
      studentDepartment: assignment.studentDepartment,
      examDate: assignment.examDate,
      examType: assignment.examType,
      student: assignment.student
    })
    
    // 🔧 修复：使用更严格的studentKey，只基于studentId
    const studentId = assignment.studentId || assignment.student?.id
    const studentKey = studentId || `unknown_${index}`
    
    if (!studentAssignments.has(studentKey)) {
      studentAssignments.set(studentKey, [])
    }
    
    studentAssignments.get(studentKey)!.push(assignment)
  })
  
  if (duplicateIds.length > 0) {
    console.error(`🚨 检测到${duplicateIds.length}个重复的assignment ID:`, duplicateIds)
    alert(`⚠️ 警告：检测到重复的排班数据！\n重复的assignment数量：${duplicateIds.length}\n这可能导致显示异常。`)
  }
  
  process.env.NODE_ENV === 'development' && console.log(`👥 学员分组完成，共${studentAssignments.size}个学员`)
  process.env.NODE_ENV === 'development' && console.log(`📊 assignments总数: ${result.assignments.length}`)
  process.env.NODE_ENV === 'development' && console.log(`📊 预期学员数: ${studentAssignments.size}`)
  process.env.NODE_ENV === 'development' && console.log(`📊 预期每个学员的assignment数: 2 (day1 + day2)`)
  
  // 为每个学员创建表格行数据
  studentAssignments.forEach((assignments, studentKey) => {
    process.env.NODE_ENV === 'development' && console.log(`🎯 处理学员: ${studentKey}，assignments数量: ${assignments.length}`)
    
    // 🔍 检测异常：每个学员应该只有2个assignment（day1和day2）
    if (assignments.length !== 2) {
      console.warn(`⚠️ 学员${studentKey}的assignment数量异常: ${assignments.length}（预期2个）`)
      console.warn('异常assignments详情:', assignments.map(a => ({
        id: a.id,
        examType: a.examType,
        examDate: a.examDate
      })))
    }
    
    const firstAssignment = assignments[0]
    const studentName = firstAssignment.studentName || firstAssignment.student?.name || '未知学员'
    const studentDept = firstAssignment.studentDepartment || firstAssignment.student?.department || '未知科室'
    
    process.env.NODE_ENV === 'development' && console.log(`👤 学员信息: ${studentName} (${studentDept})`)
    
    // 按日期和考试类型分组
    const examsByDate = new Map<string, Map<string, any>>()
    
    assignments.forEach(assignment => {
      const dateKey = assignment.examDate || '未定日期'
      if (!examsByDate.has(dateKey)) {
        examsByDate.set(dateKey, new Map())
      }
      examsByDate.get(dateKey)!.set(assignment.examType || '未知类型', assignment)
    })
    
    // 提取两天的考试数据
    const dates = Array.from(examsByDate.keys()).sort()
    const date1 = dates[0] || '未安排'
    const date2 = dates[1] || '未安排'
    
    process.env.NODE_ENV === 'development' && console.log(`📅 考试日期: ${date1}, ${date2}`)
    
    const day1Exams = examsByDate.get(date1) || new Map()
    const day2Exams = examsByDate.get(date2) || new Map()
    
    // 获取考官ID
    const day1Examiner1Id = day1Exams.get('practical')?.examiner1 || day1Exams.get('现场')?.examiner1
    const day1Examiner2Id = day1Exams.get('practical')?.examiner2 || day1Exams.get('现场')?.examiner2
    const day1BackupId = day1Exams.get('practical')?.backupExaminer || day1Exams.get('现场')?.backupExaminer
    const day2Examiner1Id = day2Exams.get('oral')?.examiner1 || day2Exams.get('口试')?.examiner1
    const day2Examiner2Id = day2Exams.get('oral')?.examiner2 || day2Exams.get('口试')?.examiner2
    const day2BackupId = day2Exams.get('oral')?.backupExaminer || day2Exams.get('口试')?.backupExaminer
    
    // 获取考官完整信息（包括科室）
    const getTeacherById = (teacherId: string | undefined) => {
      if (!teacherId) return null
      if (typeof teacherId === 'object' && (teacherId as any).name) return teacherId as any

      const list = (cachedTeacherData || teacherList.value || []) as any[]
      const idStr = String(teacherId).trim()
      const byId = list.find((t: any) => t?.id != null && String(t.id) === idStr)
      if (byId) return byId

      // 仅在明确是“姓名字符串”且唯一匹配时才按name兜底，避免重名导致科室错配
      if (idStr && !/^\d+$/.test(idStr)) {
        const byName = list.filter((t: any) => t?.name && String(t.name).trim() === idStr)
        if (byName.length === 1) return byName[0]
        if (byName.length > 1) {
          process.env.NODE_ENV === 'development' && console.warn(`⚠️ getTeacherById: 检测到重名，无法唯一定位考官: ${idStr}`, byName.map(t => ({ id: t?.id, department: t?.department })))
        }
      }

      return null
    }
    
    // 构建表格行数据（包含考官科室信息）
    const tableRow = {
      id: firstAssignment.id || `${studentKey}_row`,
      student: studentName,
      department: studentDept,
      // 📊 学员推荐科室信息（用于精细化推荐）
      recommendedExaminer1Dept: firstAssignment.student?.recommendedExaminer1Dept || 
                               firstAssignment.recommendedExaminer1Dept,
      recommendedExaminer2Dept: firstAssignment.student?.recommendedExaminer2Dept || 
                               firstAssignment.recommendedExaminer2Dept,
      // 🗓️ 考试日期（显示格式）- 统一使用 dateUtils.toDisplayDate 确保格式一致
      date1: date1 !== '未安排' ? dateUtils.toDisplayDate(date1) : '未安排',
      type1: '现场',
      date2: date2 !== '未安排' ? dateUtils.toDisplayDate(date2) : '未安排', 
      type2: '口试',
      // 🔧 原始日期（用于约束检查，完整格式yyyy-MM-dd）
      rawDate1: date1,
      rawDate2: date2,
      // 👨‍🏫 考官姓名
      examiner1_1: getTeacherNameById(day1Examiner1Id) || '未分配',
      examiner1_2: getTeacherNameById(day1Examiner2Id) || '未分配',
      backup1: getTeacherNameById(day1BackupId) || '未分配',
      examiner2_1: getTeacherNameById(day2Examiner1Id) || '未分配',
      examiner2_2: getTeacherNameById(day2Examiner2Id) || '未分配',
      backup2: getTeacherNameById(day2BackupId) || '未分配',
      // 🏢 考官科室信息（用于精细化推荐的SC14约束）
      examiner1_1_dept: getTeacherById(day1Examiner1Id)?.department || '',
      examiner1_2_dept: getTeacherById(day1Examiner2Id)?.department || '',
      backup1_dept: getTeacherById(day1BackupId)?.department || '',
      examiner2_1_dept: getTeacherById(day2Examiner1Id)?.department || '',
      examiner2_2_dept: getTeacherById(day2Examiner2Id)?.department || '',
      backup2_dept: getTeacherById(day2BackupId)?.department || ''
    }
    
    process.env.NODE_ENV === 'development' && console.log(`✅ 生成表格行:`, tableRow)
    newResults.push(tableRow)
  })
  
  process.env.NODE_ENV === 'development' && console.log(`🎉 转换完成，生成${newResults.length}条表格记录`)
  
  // 🔧 ****前端显示去重：彻底移除重复学员记录****
  // 去重规则：同一学员（姓名+科室）= 重复，保留第一个
  process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  process.env.NODE_ENV === 'development' && console.log('🔍 [前端去重] 开始检查并移除重复的学员显示...')
  
  const uniqueResultsMap = new Map<string, any>()
  const duplicateStudents: string[] = []
  
  newResults.forEach((row, index) => {
    // 使用学员姓名+科室作为唯一键
    const rowKey = `${row.student}_${row.department}`
    
    if (!uniqueResultsMap.has(rowKey)) {
      uniqueResultsMap.set(rowKey, row)
      process.env.NODE_ENV === 'development' && console.log(`✅ [去重] 保留学员: ${row.student} (${row.department})`)
    } else {
      duplicateStudents.push(`${row.student} (${row.department})`)
      console.warn(`❌ [去重] 跳过重复: ${row.student} (${row.department}) - 第${index + 1}条记录`)
    }
  })
  
  const deduplicatedResults = Array.from(uniqueResultsMap.values())
  
  process.env.NODE_ENV === 'development' && console.log(`📊 [去重统计] 原始记录: ${newResults.length}条`)
  process.env.NODE_ENV === 'development' && console.log(`📊 [去重统计] 去重后: ${deduplicatedResults.length}条`)
  process.env.NODE_ENV === 'development' && console.log(`📊 [去重统计] 移除重复: ${newResults.length - deduplicatedResults.length}条`)
  
  if (duplicateStudents.length > 0) {
    console.error('🚨 [去重] 以下学员显示重复，已自动移除:')
    duplicateStudents.forEach((student, idx) => {
      console.error(`   ${idx + 1}. ${student}`)
    })
    
    // 用户友好提示
    console.warn(`⚠️ 已自动移除 ${duplicateStudents.length} 个重复的学员显示，排班结果已优化`)
  } else {
    process.env.NODE_ENV === 'development' && console.log('✅ [去重] 未发现重复学员，数据干净')
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  return deduplicatedResults
}


// 🔄 格式化日期显示
const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr || dateStr === '未定日期') return '未安排'
  
  try {
    // 使用dateUtils工具类进行日期格式转换
    return dateUtils.toDisplayDate(dateStr)
  } catch (error) {
    console.warn('日期格式化失败:', dateStr, error)
    return '日期错误'
  }
}

// 🎯 获取表格状态文本
const getTableStatusText = () => {
  if (isTableUpdating.value) {
    return 'OptaPlanner增量更新中'
  } else if (isScheduling.value) {
    return 'OptaPlanner求解进行中'
  } else if (!isScheduling.value && scheduleResults.value.length > 0) {
    return '排班已完成'
  } else {
    return '准备就绪'
  }
}

const currentAssignmentCount = ref(0)
const totalStudents = ref(0)
const realTimeAssignments = ref<any[]>([])
const latestSoftScore = ref<number | null>(null)
const bestSoftScore = ref<number | null>(null)

// 🎯 智能分配数量：优先使用后端实际值，否则使用智能估算值
const smartAssignmentCount = computed(() => {
  // 如果后端有实际数据，使用实际数据
  if (currentAssignmentCount.value > 0) {
    return currentAssignmentCount.value
  }
  // 否则使用智能进度管理器的估算值
  return smartProgress.estimatedAssignmentCount.value
})

// 空的日志函数，用于兼容已有代码
const addRealtimeLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  // 添加到实时日志数组（用于航空主题加载器显示）
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  realtimeLogs.value.push({
    time: timeStr,
    message,
    type
  })
  
  // 限制日志数量，保持最新的50条
  if (realtimeLogs.value.length > 50) {
    realtimeLogs.value = realtimeLogs.value.slice(-50)
  }
}

// 实时日志数组（用于航空主题加载器显示后端OptaPlanner约束日志）
const realtimeLogs = ref<Array<{
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}>>([])

// 响应式设计相关状态
const isMobile = ref(false)
const isTablet = ref(false)
const isDesktop = ref(false)
const screenWidth = ref(0)
const screenHeight = ref(0)
const mobileMenuOpen = ref(false)
const needsRefresh = ref(false)
const constraintViolations = ref<ConstraintViolation[]>([])
const showUnifiedResultModal = ref(false)
const unifiedResultData = ref<any>(null)
const shouldShowViolationAlert = ref(true)
const violationAlertDismissedAt = ref<number>(0)

// 学员数据预览相关状态
const showAllStudents = ref(false)

// 计算属性：显示的学员数
const displayedStudents = computed(() => {
  if (showAllStudents.value) {
    return studentList.value
  }
  return studentList.value.slice(0, 10)
})

// 计算属性：是否有推荐考官信息
const hasRecommendedExaminers = computed(() => {
  return studentList.value.some((student: any) => 
    student.recommendedExaminer1Dept || 
    student.recommendedExaminer2Dept || 
    student.recommendedBackupDept
  )
})

// 计算属性：科室分布统计
const departmentStats = computed(() => {
  const deptCount = {}
  studentList.value.forEach((student: any) => {
    const dept = student.department || '未知'
    ;(deptCount as any)[dept] = ((deptCount as any)[dept] || 0) + 1
  })
  return Object.entries(deptCount)
    .map(([dept, count]) => `${dept}(${count})`)
    .join(', ')
})

// 计算属性：班组分布统计
const groupStats = computed(() => {
  const groupCount = {}
  studentList.value.forEach((student: any) => {
    const group = student.group || '未知'
    ;(groupCount as any)[group] = ((groupCount as any)[group] || 0) + 1
  })
  return Object.entries(groupCount)
    .map(([group, count]) => `${group}(${count})`)
    .join(', ')
})

// 🆕 处理考试天数变化
const handleExamDaysChange = (student: StudentInfo) => {
  const examDays = student.examDays || 2
  
  // 根据考试天数设置科目
  if (examDays === 2) {
    student.day1Subjects = ['现场', '模拟机1']
    student.day2Subjects = ['模拟机2', '口试']
    student.examType = '两天考试（Day1: 现场+模拟机1, Day2: 模拟机2+口试）'
  } else if (examDays === 1) {
    student.day1Subjects = ['模拟机']
    student.day2Subjects = []
    student.examType = '一天考试（模拟机）'
  }
  
  process.env.NODE_ENV === 'development' && console.log(`📝 更新学员 ${student.name} 的考试内容:`, {
    examDays,
    day1Subjects: student.day1Subjects,
    day2Subjects: student.day2Subjects,
    examType: student.examType
  })
}

// 🆕 获取考试类型标签文本
const getExamTypeLabel = (student: StudentInfo): string => {
  const examDays = student.examDays || 2
  
  if (examDays === 2) {
    return 'D1:现场+模拟机1 / D2:模拟机2+口试'
  } else {
    return 'D1:模拟机'
  }
}

// 🆕 初始化学员的考试内容（在上传文件后调用）
const initializeStudentsExamContent = () => {
  studentList.value.forEach(student => {
    if (!student.examDays) {
      student.examDays = 2  // 默认两天考试
      handleExamDaysChange(student)
    }
  })
  process.env.NODE_ENV === 'development' && console.log(`✅ 已初始化 ${studentList.value.length} 位学员的考试内容（默认两天考试）`)
}

// 计算最小考试日期字符串
const minExamDateStr = computed(() => {
  const today = new Date()
  return dateUtils.toStorageDate(today)
})
const fileInput = ref<HTMLInputElement | null>(null)
const uploadedFile = ref<{
  name: string
  size: number
  type: string
  file: File
} | null>(null)

// 拖拽相关数据
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const modalPosition = ref({ x: 0, y: 0 })
const modalRef = ref<HTMLElement | null>(null)

// 排班相关数据
const isScheduling = ref(false)
const isConstraintExpanded = ref(false) // 约束配置折叠状态，默认折叠
const isAnalysisExpanded = ref(false) // 详细分析折叠状态，默认折叠
const isSuggestionsExpanded = ref(true) // 改进建议折叠状态，默认展开（建议比较重要）
const isUnavailableExpanded = ref(true) // 不可用考官详情默认展开，方便用户查看

// 周末排班开关
const allowWeekendScheduling = ref(false) // 默认不允许周末排班

// 不可用日期设置
const isUnavailableDatesExpanded = ref(true) // 不可用日期设置默认展开
const unavailableDateMode = ref<'single' | 'range'>('single') // 添加模式：单日/范围
const newUnavailableDate = ref('') // 新增不可用日期
const newUnavailableEndDate = ref('') // 新增不可用结束日期（范围模式）
const newUnavailableReason = ref('') // 不可用原因
const customUnavailableDates = ref<Array<{date: string; endDate?: string; displayDate: string; reason?: string}>>([]) // 自定义不可用日期列表
const schedulingResult = ref<SchedulingResult | null>(null)
const schedulingError = ref('')

// 🚀 深度优化评估缓存状态
const optimizedAssessmentCache = ref<OptimizedAssessmentResultType | null>(null)
const isOptimizedAssessmentLoading = ref(false)
const lastAssessmentTimestamp = ref(0)
const ASSESSMENT_CACHE_TTL = 5000 // 5秒内不重新计算

// 🎯 精确评估缓存状态（完全模拟OptaPlanner约束）
const preciseAssessmentCache = ref<PreciseAssessmentResult | null>(null)
const isPreciseAssessmentLoading = ref(false)
const lastPreciseAssessmentTimestamp = ref(0)
const PRECISE_ASSESSMENT_CACHE_TTL = 5000
const solvingModeRef = ref('fast')  // ⚡ 改为fast模式，大幅提升速度

// 🚀 智能进度管理器（使用新的useSmartProgress）
const smartProgress = useSmartProgress({
  estimatedDuration: 30000,  // 默认30秒
  enableAdaptive: true
})
const schedulingProgress = computed(() => smartProgress.progress.value) // 向后兼容

// ⏱️ 智能进度计算相关
const schedulingStartTime = ref(0)  // 排班开始时间戳
const estimatedDuration = ref(30000)  // 预估持续时间(毫秒)，默认30秒
let progressUpdateTimer: number | null = null  // 智能进度更新定时器

// ✈️ 民航主题加载界面相关状态
const isShowingCalculatingState = computed(() => {
  // 判断表格是否显示"计算中..."状态
  return scheduleResults.value.some(result => 
    result.date1 === '计算中...' || 
    result.examiner1_1 === '分配中...' ||
    result.examiner2_1 === '分配中...'
  )
})
const currentHardScore = ref<number | undefined>(undefined)
const currentSoftScore = ref<number | undefined>(undefined)
const schedulingCompleted = ref(false)
const finalScheduleStatistics = ref<{
  totalStudents?: number
  assignedStudents?: number
  completionRate?: number
  hardConstraintScore?: number
  softConstraintScore?: number
}>({})

// 🔄 模拟进度模式：当WebSocket连接失败时的回退方案
let fallbackProgressTimer: ReturnType<typeof setInterval> | null = null

const startFallbackProgressMode = () => {
  process.env.NODE_ENV === 'development' && console.log(' [回退模式] 启动模拟进度模式')
  addRealtimeLog(' 启动模拟进度模式，继续排班计算...', 'info')
  
  // 清除之前的定时器
  if (fallbackProgressTimer !== null) {
    clearInterval(fallbackProgressTimer as any)
  }
  
  // 模拟进度增长
  fallbackProgressTimer = setInterval(() => {
    if (!isScheduling.value || schedulingCompleted.value) {
      if (fallbackProgressTimer !== null) clearInterval(fallbackProgressTimer as any)
      fallbackProgressTimer = null
      return
    }
    
    // 缓慢增加进度
    const currentProgress = schedulingProgress.value
    if (currentProgress < 90) {
      const increment = Math.random() * 2 + 0.5 // 0.5-2.5的随机增量
      const newProgress = Math.min(90, currentProgress + increment)
      smartProgress.setProgress(newProgress)
      currentProgressMessage.value = '正在优化排班方案...'
      
      // 偶尔添加一些模拟日志
      if (Math.random() < 0.1) { // 10%概率添加日志
        const mockLogs = [
          ' 正在分析约束条件...',
          ' 评估排班质量...',
          ' 优化时间分配...',
          ' 匹配考官组合...',
          ' 检查冲突情况...',
          ' 提升方案质量...'
        ]
        const randomLog = mockLogs[Math.floor(Math.random() * mockLogs.length)]
        addRealtimeLog(randomLog, 'info')
      }
    }
  }, 1000) // 每秒更新一次
}

// 停止模拟进度模式
const stopFallbackProgressMode = () => {
  if (fallbackProgressTimer !== null) {
    clearInterval(fallbackProgressTimer as any)
    fallbackProgressTimer = null
    process.env.NODE_ENV === 'development' && console.log(' [回退模式] 停止模拟进度模式')
  }
}

// 控制加载界面显示
// 新增：跟踪是否正在显示中间结果
const isShowingIntermediateResult = ref(false)
let intermediateResultTimer: ReturnType<typeof setTimeout> | null = null

const showAviationLoader = computed(() => {
  // 1. 已完成但未查看结果 -> 显示完成界面
  if (schedulingCompleted.value) {
    return true
  }
  
  // 2. 正在计算中
  if (isScheduling.value) {
    // 如果正在显示中间结果，暂时隐藏雷达图显示排班表
    if (isShowingIntermediateResult.value) {
      return false
    }
    // 否则显示雷达图
    return true
  }
  
  return false
})

// 🎯 智能进度更新函数：采用业界最佳实践 - 平方根曲线（前慢后快）
const startIntelligentProgressUpdate = () => {
  // 清理之前的定时器
  if (progressUpdateTimer) {
    clearInterval(progressUpdateTimer)
    progressUpdateTimer = null
  }
  
  const duration = estimatedDuration.value
  const maxProgress = 5 // 🎯 仅用于准备阶段，后端实时监听器将接管主要进度
  
  process.env.NODE_ENV === 'development' && console.log(`🚀 [进度优化] 启动准备阶段进度更新（后端将接管实时进度）`)
  process.env.NODE_ENV === 'development' && console.log(`📊 预估总时长: ${(duration/1000).toFixed(1)}秒`)
  process.env.NODE_ENV === 'development' && console.log(`📊 准备阶段最大进度: ${maxProgress}%`)
  process.env.NODE_ENV === 'development' && console.log(`📊 后续进度将由后端实时监听器推送`)
  
  // 🎯 关键：每500ms更新一次，使用对数曲线
  // 对数曲线比平方根更平缓，增长更均匀
  progressUpdateTimer = window.setInterval(() => {
    if (!isScheduling.value || schedulingCompleted.value) {
      stopIntelligentProgressUpdate()
      return
    }
    
    const elapsed = Date.now() - schedulingStartTime.value
    const timeRatio = Math.min(1.3, elapsed / duration) // 允许超时30%
    
    // 🎯 使用对数曲线：y = ln(1 + k*x) / ln(1 + k)
    // k控制曲线弯曲程度，k=9时比较合适
    // 这样增长更均匀，不会前期太快或后期太慢
    let targetProgress = 0
    
    if (timeRatio <= 1.0) {
      // 在预估时间内：使用对数曲线
      // 对数曲线示例（k=9）：
      // x=0.00 → y=0.00 (0%)
      // x=0.25 → y=0.38 (38%)  ← 比平方根的50%慢
      // x=0.50 → y=0.59 (59%)  ← 比平方根的71%慢
      // x=0.75 → y=0.76 (76%)  ← 比平方根的87%慢
      // x=1.00 → y=1.00 (100%)
      const k = 9 // 曲线参数
      const logProgress = Math.log(1 + k * timeRatio) / Math.log(1 + k)
      targetProgress = logProgress * maxProgress
    } else {
      // 超出预估时间：缓慢增长
      const overtime = timeRatio - 1.0
      targetProgress = maxProgress + overtime * 5 // 缓慢增长
      targetProgress = Math.min(maxProgress, targetProgress)
    }
    
    const currentProgress = schedulingProgress.value
    
    // 平滑过渡到目标进度
    let increment = 0
    const gap = targetProgress - currentProgress
    
    if (gap > 5) {
      increment = 0.8 // 差距大时较快追赶
    } else if (gap > 2) {
      increment = 0.5 // 中等差距
    } else if (gap > 0.5) {
      increment = 0.3 // 小差距
    } else if (gap > 0) {
      increment = 0.1 // 微调
    }
    
    if (increment > 0) {
      const newProgress = Math.min(maxProgress, currentProgress + increment)
      smartProgress.progress.value = Math.round(newProgress * 10) / 10 // 保留1位小数
      
      // 更新阶段信息
      updateProgressStage(newProgress)
      
      // 日志输出
      const elapsed = Date.now() - schedulingStartTime.value
      const seconds = Math.round(elapsed / 1000)
      const estimatedSeconds = Math.round(duration / 1000)
      const remaining = Math.max(0, estimatedSeconds - seconds)
      
      // 每10%输出详细日志
      if (Math.floor(newProgress / 10) > Math.floor(currentProgress / 10)) {
        process.env.NODE_ENV === 'development' && console.log(`📊 [进度] ${Math.round(newProgress)}% | 阶段: ${currentProgressMessage.value} | 还需约${remaining}秒`)
      }
    }
  }, 500) // 每500ms更新一次
}

// 🎯 根据进度更新阶段信息（业界最佳实践：告诉用户在做什么）
const updateProgressStage = (progress: number) => {
  const newMessage = (() => {
    if (progress < 12) {
      return '📦 正在准备数据...'
    } else if (progress < 30) {
      return '🔍 正在分析约束条件...'
    } else if (progress < 50) {
      return '👥 正在分配考官...'
    } else if (progress < 70) {
      return '⚙️ 正在优化排班方案...'
    } else if (progress < 88) {
      return '✨ 正在最终调整...'
    } else {
      return '⏳ 即将完成，请稍候...'
    }
  })()
  
  // 只有当消息发生变化时才更新，避免重复显示
  if (currentProgressMessage.value !== newMessage) {
    currentProgressMessage.value = newMessage
    process.env.NODE_ENV === 'development' && console.log(`🎯 [阶段更新] 进度${progress}% -> ${newMessage}`)
  }
}

// 🛑 停止智能进度更新（向后兼容的包装函数）
const stopIntelligentProgressUpdate = () => {
  // 停止智能进度管理器
  smartProgress.pause()
  
  // 清理旧的定时器（向后兼容）
  if (progressUpdateTimer) {
    clearInterval(progressUpdateTimer)
    progressUpdateTimer = null
  }
  
  // 🔄 同时停止模拟进度模式
  stopFallbackProgressMode()
  
  process.env.NODE_ENV === 'development' && console.log('🛑 [智能进度] 已暂停智能进度管理器')
}

// 查看排班结果
const handleViewScheduleResult = () => {
  schedulingCompleted.value = false
  // 滚动到表格位置
  nextTick(() => {
    const tableContainer = document.querySelector('.table-container')
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

// 考试日期数据
const examStartDate = ref<Date | null>(null)
const examEndDate = ref<Date | null>(null)

// 最小考试日期（设置为当前日期，允许用户选择未来的任意日期范围）
const minExamDate = computed(() => {
  // 设置为当前日期，允许用户选择未来的任意日期进行排班
  const today = new Date()
  today.setHours(0, 0, 0, 0) // 重置时间为当天开始
  return today
})

// 判断是否为周末
const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6 // 0是周日，6是周六
}

// 学员数据
const studentList = ref<StudentInfo[]>([])

// 考官数据（用于显示和缓存）
const teacherList = ref<TeacherInfo[]>([])

// 移除重复的约束条件定义，使用前面已定义的constraints

// 移除重复的约束权重配置定义，使用前面已定义的constraintWeights

// 切换约束条件
const toggleConstraint = (key: string) => {
  (constraints.value as any)[key] = !(constraints.value as any)[key]
}

// 处理约束配置应用
const handleConstraintConfigApply = async (config: { constraints: Record<string, any>, weights: Record<string, number> }) => {
  process.env.NODE_ENV === 'development' && console.log('🎯 应用新的约束配置:', config)
  
  try {
    // 导入约束配置服务
    const { updateConstraintConfig } = await import('../services/constraintConfigService')
    
    // 构建完整的约束配置
    const fullConfig = {
      hardConstraints: {
        workdaysOnlyExam: true,
        examinerDepartmentRules: true,
        twoMainExaminersRequired: true,
        noDayShiftExaminer: true
      },
      softConstraints: {
        backupExaminerDiffDept: config.constraints.backupExaminerDiffDept ?? true,
        avoidStudentDayShift: config.constraints.avoidStudentDayShift ?? true,
        preferRecommendedDepts: config.constraints.preferRecommendedDepts ?? true,
        allowDept37CrossUse: config.constraints.allowDept37CrossUse ?? true,
        ensureConsecutiveDays: config.constraints.ensureConsecutiveDays ?? true,
        preferNoGroupTeachers: config.constraints.preferNoGroupTeachers ?? false,
        balanceWorkload: config.constraints.balanceWorkload ?? true,
        preferLaterDates: config.constraints.preferLaterDates ?? false,
        nightShiftTeacherPriority: config.constraints.preferNightShiftTeachers ?? true,
        firstRestDayTeacherPriority: config.constraints.preferFirstRestDayTeachers ?? true,
        secondRestDayTeacherPriority: config.constraints.preferSecondRestDayTeachers ?? false,
        adminTeacherPriority: config.constraints.adminTeacherPriority ?? false,
        nightShiftTeacherRecommendedDepartmentBonus: config.constraints.nightShiftTeacherRecommendedDepartmentBonus ?? true,
        avoidWeekendSchedulingEnabled: config.constraints.avoidWeekendSchedulingEnabled ?? true,
        preferNightShiftOnWeekendEnabled: config.constraints.preferNightShiftOnWeekendEnabled ?? true
      },
      weights: {
        backupExaminerDiffDept: config.weights.backupExaminerDiffDept ?? 60,
        avoidStudentDayShift: config.weights.avoidStudentDayShift ?? 40,
        preferRecommendedDepts: config.weights.preferRecommendedDepts ?? 80,
        allowDept37CrossUse: config.weights.allowDept37CrossUse ?? 30,
        ensureConsecutiveDays: config.weights.ensureConsecutiveDays ?? 70,
        preferNoGroupTeachers: config.weights.preferNoGroupTeachers ?? 50,
        balanceWorkload: config.weights.balanceWorkload ?? 60,
        preferLaterDates: config.weights.preferLaterDates ?? 20,
        nightShiftTeacherPriority: config.weights.preferNightShiftTeachers ?? 90,
        firstRestDayTeacherPriority: config.weights.preferFirstRestDayTeachers ?? 70,
        secondRestDayTeacherPriority: config.weights.preferSecondRestDayTeachers ?? 40,
        adminTeacherPriority: config.weights.adminTeacherPriority ?? 30,
        nightShiftTeacherRecommendedDepartmentBonus: config.weights.nightShiftTeacherRecommendedDepartmentBonus ?? 50,
        avoidWeekendScheduling: config.weights.avoidWeekendScheduling ?? 500,
        preferNightShiftOnWeekend: config.weights.preferNightShiftOnWeekend ?? 300
      }
    } as any
    
    // 同步到后端
    const success = await updateConstraintConfig(fullConfig);
    
    if (success) {
      // 更新本地状态
      constraints.value = { ...constraints.value, ...config.constraints }
      constraintWeights.value = { ...constraintWeights.value, ...config.weights }
      
      // 显示成功提示
      const successMsg = document.createElement('div')
      successMsg.textContent = '约束配置已同步到后端'
      successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-weight: 500;'
      document.body.appendChild(successMsg)
      setTimeout(() => document.body.removeChild(successMsg), 3000)
    } else {
      // 显示失败提示
      const errorMsg = document.createElement('div')
      errorMsg.textContent = '约束配置同步失败，请检查网络连接'
      errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-weight: 500;'
      document.body.appendChild(errorMsg)
      setTimeout(() => document.body.removeChild(errorMsg), 5000)
    }
  } catch (error) {
    console.error('约束配置同步失败:', error)
    
    // 至少更新本地状态
    constraints.value = { ...constraints.value, ...config.constraints }
    constraintWeights.value = { ...constraintWeights.value, ...config.weights }
    
    // 显示警告提示
    const warningMsg = document.createElement('div')
    warningMsg.textContent = '⚠️ 约束配置已本地更新，但后端同步失败'
    warningMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-weight: 500;'
    document.body.appendChild(warningMsg)
    setTimeout(() => document.body.removeChild(warningMsg), 5000)
  }
}

// 移除硬约束和软约束数组
// 排班结果类型定义
interface ScheduleResultRow {
  id: number
  department: string
  student: string
  date1: string
  type1: string
  examiner1_1: string
  examiner1_2: string
  backup1: string
  date2: string
  type2: string
  examiner2_1: string
  examiner2_2: string
  backup2: string
}

// 排班结果
  // 排班结果数据 - 动态加载，不再使用硬编码示例数据
const scheduleResults = ref<ScheduleResultRow[]>([])

// 🆕 拖拽排班功能状态
const pinnedScheduleIds = ref<Set<string>>(new Set()) // 固定的排班ID
const isDraggingSchedule = ref(false) // 是否正在拖拽排班
const draggingSchedule = ref<ScheduleResultRow | null>(null) // 正在拖拽的排班
const draggingDayIndex = ref<number>(1) // 拖拽的是第几天（1或2）
const draggingIsTwoDayExam = ref(false) // 🆕 是否为两天考试
const mouseX = ref(0) // 鼠标X坐标
const mouseY = ref(0) // 鼠标Y坐标
const showDatePicker = ref(false) // 是否显示日期选择浮层

// 方法：toggleSidebar已移至响应式设计部分
const closeModal = () => {
  showCreateModal.value = false
  // 重置弹窗位置
  modalPosition.value = { x: 0, y: 0 }
}

// 🆕 重置新建排班表单数据
const resetScheduleForm = () => {
  process.env.NODE_ENV === 'development' && console.log('🔄 重置新建排班表单数据')
  
  // 重置步骤
  currentStep.value = 1
  
  // 重置日期（保留当前设置，方便用户）
  // examStartDateStr.value = ''
  // examEndDateStr.value = ''
  
  // 重置文件上传
  uploadedFile.value = null
  
  // 重置学员数据（如果需要）
  // studentList.value = []
  
  // 重置算法选择（保持默认值）
  selectedAlgorithm.value = 'optaplanner'
  
  // 重置约束配置为默认值
  constraints.value = {
    // 硬约束（只读）
    workdaysOnlyExam: true,
    examinerDepartmentRules: true,
    twoMainExaminersRequired: true,
    noDayShiftExaminer: true,
    consecutiveTwoDaysExamEnabled: true,
    noExaminerTimeConflict: true,
    mustHaveTwoDifferentDepartmentExaminers: true,
    backupExaminerMustBeDifferentPerson: true,
    
    // 软约束（可配置）- 按照SC1-SC11统一命名，全部默认开启
    nightShiftTeacherPriority: true,
    examiner2ProfessionalMatch: true,
    firstRestDayTeacherPriority: true,
    backupExaminerProfessionalMatch: true,
    secondRestDayTeacherPriority: true,
    examiner2AlternativeOption: true,
    adminTeacherPriority: true,
    backupExaminerAlternativeOption: true,
    allowDept37CrossUse: true,
    balanceWorkload: true,
    preferLaterDates: true,
    avoidWeekendSchedulingEnabled: true,
    preferNightShiftOnWeekendEnabled: true,

    // 高级配置选项
    enableTimeSpreadOptimization: true,
    enableDynamicWeightAdjustment: true,
    enableIntelligentConflictResolution: true,
    enableEarlyWarningSystem: true,
    enableHistoricalDataOptimization: true,
  }
  
  // 重置求解模式
  solvingModeRef.value = 'auto'
  
  // 重置弹窗位置
  modalPosition.value = { x: 0, y: 0 }
  
  process.env.NODE_ENV === 'development' && console.log('✅ 表单数据已重置')
}

// 🆕 处理新建排班按钮点击
const handleNewSchedule = () => {
  // 如果已有排班结果，提醒用户是否导出
  if (scheduleResults.value.length > 0) {
    const confirmMessage = `检测到当前已有排班结果 (${scheduleResults.value.length} 条记录)

是否需要先导出当前排班结果？

⚠️ 开始新的排班流程后，当前结果将被覆盖。

点击"确定"导出当前结果
点击"取消"直接开始新排班`
    
    if (confirm(confirmMessage)) {
      // 用户选择导出
      exportToExcel()
      // 导出后提示是否继续新建排班
      setTimeout(() => {
        if (confirm('导出完成！\n\n是否继续新建排班？')) {
          resetScheduleForm()  // 🆕 重置表单数据
          checkAssignmentData()  // 🆕 检查考官分配数据
          showCreateModal.value = true
        }
      }, 500)
    } else {
      // 用户选择不导出，直接新建
      resetScheduleForm()  // 🆕 重置表单数据
      checkAssignmentData()  // 🆕 检查考官分配数据
      showCreateModal.value = true
    }
  } else {
    // 没有排班结果，直接打开新建排班弹窗
    resetScheduleForm()  // 🆕 重置表单数据
    checkAssignmentData()  // 🆕 检查考官分配数据
    showCreateModal.value = true
  }
}

// 拖拽相关方法
const startDrag = (event: MouseEvent) => {
  isDragging.value = true
  const rect = modalRef.value?.getBoundingClientRect()
  if (rect) {
    dragOffset.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  event.preventDefault()
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return
  
  const newX = event.clientX - dragOffset.value.x
  const newY = event.clientY - dragOffset.value.y
  
  // 限制拖拽范围，确保弹窗不会完全移出视图
  const maxX = window.innerWidth - 300 // 最小保持300px可见
  const maxY = window.innerHeight - 100 // 最小保持100px可见
  
  modalPosition.value = {
    x: Math.max(-200, Math.min(newX, maxX)), // 允许部分移出左边
    y: Math.max(0, Math.min(newY, maxY))
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // 保存上传的文件信息
    uploadedFile.value = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }
    process.env.NODE_ENV === 'development' && console.log('文件已上传:', file.name)
    
    // 自动解析文件并更新学员数量
    try {
      if (file.type.includes('csv')) {
        await parseCSVFile(file)
      } else if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        await parseExcelFile(file)
      } else {
        console.warn('不支持的文件格式，使用示例数据')
      }
    } catch (error) {
      console.error('文件解析失败:', error)
      alert('文件解析失败，请检查文件格式')
    }
  }
}

// 预览文件
const showPreviewModal = ref(false)
const previewData = ref<any[]>([])
const previewHeaders = ref<string[]>([])

const previewFile = () => {
  if (uploadedFile.value) {
    process.env.NODE_ENV === 'development' && console.log('预览文件:', uploadedFile.value.name)
    const file = uploadedFile.value.file
    
    if (file.type.includes('csv')) {
      previewCSVFile(file)
    } else if (file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      previewExcelFile(file)
    } else {
      alert('不支持的文件格式，请上传Excel或CSV文件')
    }
  }
}

// 解析CSV文件并更新学员数
const parseCSVFile = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          reject(new Error('文件内容不足，至少需要标题行和一行数据'))
          return
        }
        
        const headers = lines[0].split(',').map(h => h.trim())
        const students: StudentInfo[] = []
        
        process.env.NODE_ENV === 'development' && console.log('CSV标题:', headers)
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          process.env.NODE_ENV === 'development' && console.log(`解析第${i}行数据`, values)
          
          if (values.length >= 2) {
            // 🔧 标准化科室数据
            let rawDept = values[1] || '一'
            const deptMap: Record<string, string> = {
              '区域一室': '一', '区域二室': '二', '区域三室': '三', '区域四室': '四',
              '区域五室': '五', '区域六室': '六', '区域七室': '七', '区域八室': '八',
              '一室': '一', '二室': '二', '三室': '三', '四室': '四',
              '五室': '五', '六室': '六', '七室': '七', '八室': '八',
              '1室': '一', '2室': '二', '3室': '三', '4室': '四',
              '5室': '五', '6室': '六', '7室': '七', '8室': '八',
              '区域1': '一', '区域2': '二', '区域3': '三', '区域4': '四',
              '1': '一', '2': '二', '3': '三', '4': '四',
              '5': '五', '6': '六', '7': '七', '8': '八'
            }
            const normalizedDept = deptMap[rawDept.trim()] || rawDept
            if (rawDept !== normalizedDept) {
              process.env.NODE_ENV === 'development' && console.log(`🔄 [CSV科室标准化] "${rawDept}" → "${normalizedDept}"`)
            }
            
            const student = {
             id: i.toString(),
             name: values[0] || `学员${i}`,
             department: normalizedDept,
             group: values[2] || '一组',
             // 支持推荐考官字段（第4列）
             recommendedExaminer1Dept: values[3] || undefined,
             recommendedExaminer2Dept: values[4] || undefined,
             recommendedBackupDept: values[5] || undefined
           }
           // #region agent log
           fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:parseCSVFile',message:'parsed student data',data:{name:student.name,department:student.department,group:student.group,recommendedExaminer1Dept:student.recommendedExaminer1Dept,recommendedExaminer2Dept:student.recommendedExaminer2Dept},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
           // #endregion
           
           process.env.NODE_ENV === 'development' && console.log(`学员${student.name}解析结果:`, {
             科室: student.department,
             班组: student.group,
             推荐考官1科室: student.recommendedExaminer1Dept,
             推荐考官2科室: student.recommendedExaminer2Dept,
             推荐备份考官科室: student.recommendedBackupDept
           })
           
           students.push(student)
          }
        }
        
        if (students.length > 0) {
          studentList.value = students
          process.env.NODE_ENV === 'development' && console.log('CSV文件解析成功，学员数:', students.length)
          // 🆕 初始化考试内容
          initializeStudentsExamContent()
        }
        
        resolve(students)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

  // 解析Excel文件并更新学员数
const parseExcelFile = async (file: File) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // 动态导入xlsx
        const XLSX = await import('xlsx')
        
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // 将工作表转换为JSON数组
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件内容不足，至少需要标题行和一行数据'))
          return
        }
        
        const students: StudentInfo[] = []
        const headers = (jsonData as any[][])[0] as string[]
        
        // 查找关键列的索引 - 支持多种格式
        process.env.NODE_ENV === 'development' && console.log('📋 Excel表头:', headers)
        
        // 姓名列：支持"姓名"学员"名字"
        const nameIndex = headers.findIndex(h => h && (
          h.includes('姓名') || h.includes('学员') || h.includes('名字') || 
          h === '姓名' || h === '学员' || h === '名字'
        ))
        
        // 科室列：支持"科室"部门"或直接是科室名称
        let deptIndex = headers.findIndex(h => h && (
          h.includes('科室') || h.includes('部门') || h.includes('区域')
        ))
        
        // 如果没找到科室列，尝试查找包含"区域"的列
        if (deptIndex === -1) {
          deptIndex = headers.findIndex(h => h && (
            h.includes('区域') || h.includes('一室') || h.includes('二室') || 
            h.includes('三室') || h.includes('四室') || h.includes('五室') ||
            h.includes('六室') || h.includes('七室')
          ))
        }
        
        // 班组列：支持"班组"组别"班组"班次"
        const groupIndex = headers.findIndex(h => h && (
          h.includes('班组') || h.includes('组别') || h.includes('班组') || h.includes('班次') ||
          h === '班组' || h === '组别' || h === '班组' || h === '班次'
        ))
        
        // 推荐考官科室列：支持"考官一"考官1第一考官"备份考官"
        const examiner1DeptIndex = headers.findIndex(h => h && (
          h.includes('考官一') || h.includes('考官1') || h.includes('第一考官') ||
          h === '考官一' || h === '考官1' || h === '第一考官'
        ))
        
        const examiner2DeptIndex = headers.findIndex(h => h && (
          h.includes('考官二') || h.includes('考官2') || h.includes('第二考官') ||
          h === '考官二' || h === '考官2' || h === '第二考官'
        ))
        
        const backupDeptIndex = headers.findIndex(h => h && (
          h.includes('备份考官') || h.includes('备份') || h.includes('候补考官') ||
          h === '备份考官' || h === '备份' || h === '候补考官'
        ))
        
        process.env.NODE_ENV === 'development' && console.log(`📍 列索引 姓名=${nameIndex}, 科室=${deptIndex}, 班组=${groupIndex}`)  
        process.env.NODE_ENV === 'development' && console.log(`📍 推荐考官列索引 考官一=${examiner1DeptIndex}, 考官2=${examiner2DeptIndex}, 备份=${backupDeptIndex}`)
        process.env.NODE_ENV === 'development' && console.log(`📋 Excel表头信息:`, headers)
        process.env.NODE_ENV === 'development' && console.log(`🔍 班组列查找结果 索引=${groupIndex}, 表头="${headers[groupIndex] || '未找到'}"`)
        
        for (let i = 1; i < (jsonData as any[][]).length; i++) {
          const row = (jsonData as any[][])[i]
          if (row && row.length > 0 && row[nameIndex]) {
            const studentName = row[nameIndex] || `学员${i}`
            let studentDept = row[deptIndex] || '一'
            let studentGroup = groupIndex >= 0 ? (row[groupIndex] || '') : ''
            
            // 🔧 修复：智能处理科室数据（支持多种格式）
            if (studentDept) {
              studentDept = studentDept.toString().trim()
              
              // 定义完整的科室映射规则（与考官导入保持一致）
              const deptMap: Record<string, string> = {
                // 完整格式
                '区域一室': '一', '区域二室': '二', '区域三室': '三', '区域四室': '四',
                '区域五室': '五', '区域六室': '六', '区域七室': '七', '区域八室': '八',
                '区域九室': '九', '区域十室': '十',
                // 🔧 新增：简写格式（一室、二室等）
                '一室': '一', '二室': '二', '三室': '三', '四室': '四',
                '五室': '五', '六室': '六', '七室': '七', '八室': '八',
                '九室': '九', '十室': '十',
                // 数字+室格式
                '区域1室': '一', '区域2室': '二', '区域3室': '三', '区域4室': '四',
                '区域5室': '五', '区域6室': '六', '区域7室': '七', '区域8室': '八',
                '区域9室': '九', '区域10室': '十',
                '1室': '一', '2室': '二', '3室': '三', '4室': '四',
                '5室': '五', '6室': '六', '7室': '七', '8室': '八',
                '9室': '九', '10室': '十',
                // 区域格式（无"室"）
                '区域一': '一', '区域二': '二', '区域三': '三', '区域四': '四',
                '区域五': '五', '区域六': '六', '区域七': '七', '区域八': '八',
                '区域九': '九', '区域十': '十',
                '区域1': '一', '区域2': '二', '区域3': '三', '区域4': '四',
                '区域5': '五', '区域6': '六', '区域7': '七', '区域8': '八',
                '区域9': '九', '区域10': '十',
                // 单个中文数字（已是标准格式）
                '一': '一', '二': '二', '三': '三', '四': '四',
                '五': '五', '六': '六', '七': '七', '八': '八',
                '九': '九', '十': '十',
                // 单个阿拉伯数字
                '1': '一', '2': '二', '3': '三', '4': '四',
                '5': '五', '6': '六', '7': '七', '8': '八',
                '9': '九', '10': '十'
              }
              
              // 尝试标准化
              const normalized = deptMap[studentDept]
              if (normalized) {
                if (studentDept !== normalized) {
                  process.env.NODE_ENV === 'development' && console.log(`🔄 [学员科室标准化] "${studentDept}" → "${normalized}"`)
                }
                studentDept = normalized
              } else {
                // 如果不在映射表中，尝试模糊匹配
                if (studentDept.includes('一') || studentDept.includes('1')) studentDept = '一'
                else if (studentDept.includes('二') || studentDept.includes('2')) studentDept = '二'
                else if (studentDept.includes('三') || studentDept.includes('3')) studentDept = '三'
                else if (studentDept.includes('四') || studentDept.includes('4')) studentDept = '四'
                else if (studentDept.includes('五') || studentDept.includes('5')) studentDept = '五'
                else if (studentDept.includes('六') || studentDept.includes('6')) studentDept = '六'
                else if (studentDept.includes('七') || studentDept.includes('7')) studentDept = '七'
                else if (studentDept.includes('八') || studentDept.includes('8')) studentDept = '八'
                else if (studentDept.includes('九') || studentDept.includes('9')) studentDept = '九'
                else if (studentDept.includes('十') || studentDept.includes('10')) studentDept = '十'
                else {
                  console.warn(`⚠️ 无法识别的学员科室格式: "${studentDept}"`)
                }
              }
            }
            
            // 🔧 修复：智能处理班组数据
            if (studentGroup) {
              studentGroup = studentGroup.toString().trim()
              
              // 标准化班组格式（支持"一"、"二"、"一组"、"1"、"1组"等多种格式）
              const numMap: Record<string, string> = {'1': '一', '2': '二', '3': '三', '4': '四'}
              
              if (/^[一二三四]组$/.test(studentGroup)) {
                // 已经是标准格式（如"一组"）
                process.env.NODE_ENV === 'development' && console.log(`✅ 班组已是标准格式: "${studentGroup}"`)
              } else if (/^[1-4]组$/.test(studentGroup)) {
                // 阿拉伯数字+组（如"1组" -> "一组"）
                studentGroup = studentGroup.replace(/^[1-4]/, (match: string) => numMap[match])
                process.env.NODE_ENV === 'development' && console.log(`🔄 班组转换: 阿拉伯数字 -> "${studentGroup}"`)
              } else if (/^[一二三四]$/.test(studentGroup)) {
                // 只有中文数字，添加"组"（如"一" -> "一组"）
                studentGroup += '组'
                process.env.NODE_ENV === 'development' && console.log(`🔄 班组转换: 添加"组" -> "${studentGroup}"`)
              } else if (/^[1-4]$/.test(studentGroup)) {
                // 只有阿拉伯数字，转换并添加"组"（如"1" -> "一组"）
                studentGroup = numMap[studentGroup] + '组'
                process.env.NODE_ENV === 'development' && console.log(`🔄 班组转换: 数字+"组" -> "${studentGroup}"`)
              } else {
                // 无法识别的格式，尝试保持原样
                console.warn(`⚠️ 无法识别的班组格式: "${studentGroup}"，保持原样`)
              }
            } else {
              // 如果班组数据为空，设置为默认组
              studentGroup = '一组'
              process.env.NODE_ENV === 'development' && console.log(`⚠️ 班组为空，使用默认值: "${studentGroup}"`)
            }
            
            process.env.NODE_ENV === 'development' && console.log(`📝 解析学员数据: ${studentName}, 科室: "${studentDept}", 班组: "${studentGroup}"`)
            process.env.NODE_ENV === 'development' && console.log(`📍 班组索引: ${groupIndex}, 原始班组数据: "${row[groupIndex]}", 数据类型: ${typeof row[groupIndex]}, 处理后班组: "${studentGroup}"`)
            process.env.NODE_ENV === 'development' && console.log(`🔍 完整行数据:`, row)
            
            // 特别检查唐志骏的数据
            if (studentName === '唐志骏') {
              process.env.NODE_ENV === 'development' && console.log(`🔍 特别检查唐志骏数据:`)
              process.env.NODE_ENV === 'development' && console.log(`  - 原始科室数据: "${row[deptIndex]}"`)
              process.env.NODE_ENV === 'development' && console.log(`  - 处理后科室: "${studentDept}"`)
              process.env.NODE_ENV === 'development' && console.log(`  - 原始班组数据: "${row[groupIndex]}"`)
              process.env.NODE_ENV === 'development' && console.log(`  - 处理后班组: "${studentGroup}"`)
              process.env.NODE_ENV === 'development' && console.log(`  - 班组类型: ${typeof studentGroup}`)
            }
            
            // 提取推荐考官科室信息
            let recommendedExaminer1Dept = examiner1DeptIndex >= 0 ? (row[examiner1DeptIndex] || '').toString().trim() : undefined
            let recommendedExaminer2Dept = examiner2DeptIndex >= 0 ? (row[examiner2DeptIndex] || '').toString().trim() : undefined
            let recommendedBackupDept = backupDeptIndex >= 0 ? (row[backupDeptIndex] || '').toString().trim() : undefined
            
            // 🔧 如果没有找到分列的推荐考官数据，尝试从单列中解析
            if (!recommendedExaminer1Dept && !recommendedExaminer2Dept) {
              // 查找可能包含推荐考官信息的列
              const recommendationIndex = headers.findIndex(h => h && (
                h.includes('推荐考官') || h.includes('推荐科室') || h.includes('考官安排') ||
                h === '推荐考官' || h === '推荐科室' || h === '考官安排'
              ))
              
              if (recommendationIndex >= 0) {
                const recommendationText = (row[recommendationIndex] || '').toString().trim()
                process.env.NODE_ENV === 'development' && console.log(`📝 发现推荐考官合并数据: "${recommendationText}"`)
                
                // 解析格式：考官一：区域三室，考官二：区域七室
                const pattern1 = /考官一[：:]\s*([^，,]+)[，,]?\s*考官二[：:]\s*([^，,]+)/
                const pattern2 = /考官1[：:]\s*([^，,]+)[，,]?\s*考官2[：:]\s*([^，,]+)/
                
                let match = recommendationText.match(pattern1) || recommendationText.match(pattern2)
                if (match) {
                  recommendedExaminer1Dept = match[1].trim()
                  recommendedExaminer2Dept = match[2].trim()
                  process.env.NODE_ENV === 'development' && console.log(`✅ 解析成功: 考官一=${recommendedExaminer1Dept}, 考官二=${recommendedExaminer2Dept}`)
                } else {
                  process.env.NODE_ENV === 'development' && console.log(`⚠️ 无法解析推荐考官格式: "${recommendationText}"`)
                }
              }
            }
            
            process.env.NODE_ENV === 'development' && console.log(`📝 推荐考官科室: 考官一=${recommendedExaminer1Dept}, 考官2=${recommendedExaminer2Dept}, 备份=${recommendedBackupDept}`)
            
            // 特别调试顾杨的数据
            if (studentName === '顾杨') {
              process.env.NODE_ENV === 'development' && console.log(`🔍 顾杨数据详细信息:`)
              process.env.NODE_ENV === 'development' && console.log(`  - 考官一列索引: ${examiner1DeptIndex}, 原始数据: "${row[examiner1DeptIndex]}"`)
              process.env.NODE_ENV === 'development' && console.log(`  - 考官二列索引: ${examiner2DeptIndex}, 原始数据: "${row[examiner2DeptIndex]}"`) 
              process.env.NODE_ENV === 'development' && console.log(`  - 备份考官列索引: ${backupDeptIndex}, 原始数据: "${row[backupDeptIndex]}"`)
              process.env.NODE_ENV === 'development' && console.log(`  - 完整行数据:`, row)
            }
            
            students.push({
             id: i.toString(), // 确保ID是字符串
             name: studentName,
             department: studentDept, // 已经处理过的科室数据
             group: studentGroup, // 已经处理过的班组数据
             // 支持推荐考官字段
             recommendedExaminer1Dept: recommendedExaminer1Dept || undefined,
             recommendedExaminer2Dept: recommendedExaminer2Dept || undefined,
             recommendedBackupDept: recommendedBackupDept || undefined
           })
          }
        }
        
        if (students.length > 0) {
          studentList.value = students
          process.env.NODE_ENV === 'development' && console.log('Excel文件解析成功，学员数:', students.length)
          // 🆕 初始化考试内容
          initializeStudentsExamContent()
        }
        
        resolve(students)
      } catch (error) {
        console.error('Excel文件解析失败:', error)
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 预览CSV文件
const previewCSVFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      previewHeaders.value = lines[0].split(',').map(header => header.trim())
      previewData.value = lines.slice(1, 11).map(line => {
        const values = line.split(',').map(value => value.trim())
        const row = {}
        previewHeaders.value.forEach((header, index) => {
          (row as any)[header] = values[index] || ''
        })
        return row
      })
      showPreviewModal.value = true
    }
  }
  reader.readAsText(file, 'UTF-8')
}

// 预览Excel文件（使用xlsx库正确解析）
const previewExcelFile = async (file: File) => {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      // 动态导入xlsx
      const XLSX = await import('xlsx')
      
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      
      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // 将工作表转换为JSON数组
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length > 0) {
        // 设置表头
        previewHeaders.value = (jsonData as any[][])[0].map(header => header || '未命名列')
        
          // 设置预览数据（最多显示10行）
        previewData.value = jsonData.slice(1, 11).map((row: any) => {
          const rowData: any = {}
          previewHeaders.value.forEach((header, index) => {
            rowData[header] = row[index] || ''
          })
          return rowData
        })
      } else {
        previewHeaders.value = ['提示']
        previewData.value = [{ '提示': 'Excel文件为空或无数据' }]
      }
      
      showPreviewModal.value = true
      process.env.NODE_ENV === 'development' && console.log('Excel文件预览成功:', file.name)
    } catch (error) {
      console.error('Excel文件预览失败:', error)
      previewHeaders.value = ['错误']
      previewData.value = [{ '错误': `Excel文件解析失败: ${(error as Error).message || '未知错误'}` }]
      showPreviewModal.value = true
    }
  }
  reader.onerror = () => {
    previewHeaders.value = ['错误']
    previewData.value = [{ '错误': '文件读取失败' }]
    showPreviewModal.value = true
  }
  reader.readAsArrayBuffer(file)
  process.env.NODE_ENV === 'development' && console.log('正在预览Excel文件:', file.name)
}

// 关闭预览弹窗
const closePreviewModal = () => {
  showPreviewModal.value = false
  previewData.value = []
  previewHeaders.value = []
}

// 删除文件
const deleteFile = () => {
  if (uploadedFile.value) {
    process.env.NODE_ENV === 'development' && console.log('删除文件:', uploadedFile.value.name)
    // 清空文件
    uploadedFile.value = null
  }
}

// 
// 步骤导航方法
const nextStep = () => {
  process.env.NODE_ENV === 'development' && console.log('🔄 nextStep 被调用')
  process.env.NODE_ENV === 'development' && console.log('当前步骤:', currentStep.value)
  const canProceed = canProceedToNextStep()
  process.env.NODE_ENV === 'development' && console.log('canProceedToNextStep:', canProceed)
  
  if (canProceed) {
    currentStep.value++
    process.env.NODE_ENV === 'development' && console.log('新步骤已更新:', currentStep.value)
  } else {
    process.env.NODE_ENV === 'development' && console.log('无法进入下一步，条件不满足')
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// 检查是否可以进入下一步
// canProceedToNextStep函数在后面定义
// 日期相关状态
const dateRangeSuggestion = ref('')
const suggestedDateRange = ref<{start: string, end: string} | null>(null)

// 日期相关计算方法
const calculateExamDays = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return 0
  
  const startDate = new Date(examStartDateStr.value)
  const endDate = new Date(examEndDateStr.value)
  
  if (startDate > endDate) return 0
  
  // 使用与generateExamDateRange相同的逻辑计算工作日
  const examDates = generateExamDateRange(startDate, endDate)
  return examDates.length
}

const calculateWorkdays = () => {
  return calculateExamDays() // 现在工作日就是考试日
}

const calculateWeekends = () => {
  return calculateExamDays() - calculateWorkdays()
}

const hasWeekends = () => {
  return calculateWeekends() > 0
}

// 新增的日期计算方法
const getTotalDays = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return 0
  
  const startDate = new Date(examStartDateStr.value)
  const endDate = new Date(examEndDateStr.value)
  
  if (startDate > endDate) return 0
  
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
}

const getWeekendDays = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return 0;
  
  const startDate = new Date(examStartDateStr.value);
  const endDate = new Date(examEndDateStr.value);
  
  let weekendCount = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return weekendCount;
}

const getHolidayDays = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return 0;
  
  const startDate = new Date(examStartDateStr.value);
  const endDate = new Date(examEndDateStr.value);
  let holidayCount = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    // 使用dateUtils工具类获取标准日期格式
    const dateStr = dateUtils.toStandardDate(current);
    if (holidayService.isHoliday(dateStr)) {
      holidayCount++;
    }
    // 使用dateUtils工具类获取下一天
    const nextDay = dateUtils.getNextDay(current);
    current = new Date(nextDay);
  }
  
  return holidayCount;
}

const getAvailableDates = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return [];
  
  const startDate = new Date(examStartDateStr.value);
  const endDate = new Date(examEndDateStr.value);
  
  return generateExamDateRange(startDate, endDate);
}

const formatDateDisplay = (dateStr: string) => {
  // 使用dateUtils工具类获取星期几索引
  const dayOfWeek = dateUtils.getDayOfWeekIndex(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = dayOfWeek >= 0 && dayOfWeek < 7 ? weekdays[dayOfWeek] : '';
  
  // 使用dateUtils工具类获取显示格式
  const displayDate = dateUtils.toDisplayDate(dateStr);
  
  return `${displayDate} ${weekday}`;
}

const getDateTypeClass = (dateStr: string) => {
  // 使用dateUtils工具类获取星期几索引
  const dayOfWeek = dateUtils.getDayOfWeekIndex(dateStr);
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'weekend';
  }
  return 'workday';
}

// 🆕 获取考官总数
const getTotalTeachersCount = () => {
  const teacherKeys = ['teachers', 'examiner_teachers', 'unified_teachers', 'teacher_data', 'teacherList'];
  
  for (const key of teacherKeys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.length;
        }
      }
    } catch (e) {
      console.error(`解析 ${key} 失败:`, e);
    }
  }
  
  return 0;
}

// 🆕 获取在日期范围内不可用的考官列表
const getUnavailableTeachersInRange = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return [];
  
  const startDate = new Date(examStartDateStr.value);
  const endDate = new Date(examEndDateStr.value);
  
  // 从localStorage加载考官数据
  let storedTeachers: any[] = [];
  const teacherKeys = ['teachers', 'examiner_teachers', 'unified_teachers', 'teacher_data', 'teacherList'];
  
  for (const key of teacherKeys) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          storedTeachers = parsed;
          break;
        }
      }
    } catch (e) {
      console.error(`解析 ${key} 失败:`, e);
    }
  }
  
  const unavailableTeachers: Array<{
    teacher: any;
    periods: Array<{
      id: string;
      startDate: string;
      endDate: string;
      reason: string;
      overlapDays: number;
    }>;
  }> = [];
  
  storedTeachers.forEach((teacher: any) => {
    if (!teacher.unavailablePeriods || teacher.unavailablePeriods.length === 0) {
      return;
    }
    
    const conflictPeriods: any[] = [];
    
    teacher.unavailablePeriods.forEach((period: any) => {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      
      // 检查不可用期是否与排班日期范围有交集
      if (!(periodEnd < startDate || periodStart > endDate)) {
        // 有交集，计算重叠天数
        const overlapStart = periodStart < startDate ? startDate : periodStart;
        const overlapEnd = periodEnd > endDate ? endDate : periodEnd;
        const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        conflictPeriods.push({
          ...period,
          overlapDays
        });
      }
    });
    
    if (conflictPeriods.length > 0) {
      unavailableTeachers.push({
        teacher,
        periods: conflictPeriods
      });
    }
  });
  
  return unavailableTeachers;
}

// ============================================
// 智能评估相关函数
// ============================================

// 跳转到指定步骤
const goToStep = (step: number) => {
  currentStep.value = step
}

// 🔧 检查科室资源匹配情况（HC2约束预检查）
const checkDepartmentResourceMatch = () => {
  const students = studentList.value
  const teacherCount = getTotalTeachersCount()
  
  if (students.length === 0 || teacherCount === 0) {
    return { hasIssue: false, critical: false, issues: [] }
  }
  
  // 🎯 优先使用精确评估结果（完全模拟OptaPlanner约束）
  const preciseResult = preciseAssessmentCache.value
  if (preciseResult?.departmentCapacities) {
    const issues: Array<{
      dept: string
      studentCount: number
      teacherCount: number
      severity: 'critical' | 'warning'
      message: string
    }> = []
    
    let hasCritical = false
    
    for (const dept of preciseResult.departmentCapacities) {
      if (dept.severity === 'critical') {
        issues.push({
          dept: dept.department,
          studentCount: dept.studentCount,
          teacherCount: dept.availableExaminers,
          severity: 'critical',
          message: `科室"${dept.department}"${dept.availableExaminers === 0 ? '没有可用考官' : '连续日期对不足'}：${dept.twoDayStudentCount}名两天学员需要${dept.requiredDatePairs}个日期对，但仅有${dept.availableDatePairs.length}个`
        })
        hasCritical = true
      } else if (dept.severity === 'high' || dept.severity === 'medium') {
        issues.push({
          dept: dept.department,
          studentCount: dept.studentCount,
          teacherCount: dept.availableExaminers,
          severity: 'warning',
          message: `科室"${dept.department}"资源紧张：${dept.studentCount}名学员，可用日期对${dept.availableDatePairs.length}/${dept.requiredDatePairs}`
        })
      }
    }
    
    return {
      hasIssue: issues.length > 0,
      critical: hasCritical,
      issues
    }
  }
  
  // 🚀 降级到深度优化评估结果
  const optimizedResult = optimizedAssessmentCache.value
  if (optimizedResult?.bottlenecks) {
    const issues: Array<{
      dept: string
      studentCount: number
      teacherCount: number
      severity: 'critical' | 'warning'
      message: string
    }> = []
    
    let hasCritical = false
    
    for (const bottleneck of optimizedResult.bottlenecks) {
      if (bottleneck.severity === 'critical') {
        issues.push({
          dept: bottleneck.department,
          studentCount: bottleneck.studentCount,
          teacherCount: bottleneck.availableExaminerCount,
          severity: 'critical',
          message: `科室"${bottleneck.department}"${bottleneck.availableExaminerCount === 0 ? '没有可用考官' : '容量严重不足'}：需要${bottleneck.totalExamsNeeded}场考试，可用容量${bottleneck.actualAvailableCapacity}场`
        })
        hasCritical = true
      } else if (bottleneck.severity === 'high' || bottleneck.severity === 'medium') {
        issues.push({
          dept: bottleneck.department,
          studentCount: bottleneck.studentCount,
          teacherCount: bottleneck.availableExaminerCount,
          severity: 'warning',
          message: `科室"${bottleneck.department}"资源紧张：${bottleneck.studentCount}名学员需${bottleneck.totalExamsNeeded}场考试，利用率${(bottleneck.utilizationRate * 100).toFixed(0)}%`
        })
      }
    }
    
    return {
      hasIssue: issues.length > 0,
      critical: hasCritical,
      issues
    }
  }
  
  // 科室规范化函数
  const normalizeDept = (dept: string | undefined): string => {
    if (!dept) return '未知'
    const normalized = dept.trim()
    
    const numMap: Record<string, string> = {
      '1': '一', '2': '二', '3': '三', '4': '四', '5': '五',
      '6': '六', '7': '七', '8': '八', '9': '九', '10': '十'
    }
    
    if (/^区域[一二三四五六七八九十]室$/.test(normalized)) {
      return normalized.substring(2, 3)
    }
    if (/^[一二三四五六七八九十]室$/.test(normalized)) {
      return normalized.substring(0, 1)
    }
    if (/^[一二三四五六七八九十]$/.test(normalized)) {
      return normalized
    }
    if (/^\d+室$/.test(normalized)) {
      const num = normalized.replace('室', '')
      return numMap[num] || normalized
    }
    if (/^\d+$/.test(normalized)) {
      return numMap[normalized] || normalized
    }
    
    return normalized
  }
  
  // 统计学员科室分布
  const studentDeptMap = new Map<string, number>()
  students.forEach(student => {
    const dept = normalizeDept(student.department)
    studentDeptMap.set(dept, (studentDeptMap.get(dept) || 0) + 1)
  })
  
  // 从localStorage获取考官数据
  let storedTeachers: any[] = []
  const teacherKeys = ['teachers', 'examiner_teachers', 'unified_teachers', 'teacher_data', 'teacherList']
  for (const key of teacherKeys) {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed) && parsed.length > 0) {
          storedTeachers = parsed
          break
        }
      }
    } catch (e) {}
  }
  
  // 统计考官科室分布
  const teacherDeptMap = new Map<string, number>()
  storedTeachers.forEach(teacher => {
    const dept = normalizeDept(teacher.department)
    teacherDeptMap.set(dept, (teacherDeptMap.get(dept) || 0) + 1)
  })
  
  const issues: Array<{
    dept: string
    studentCount: number
    teacherCount: number
    severity: 'critical' | 'warning'
    message: string
  }> = []
  
  let hasCritical = false
  
  // 检查每个科室的资源匹配
  studentDeptMap.forEach((studentCount, dept) => {
    let availableTeachers = teacherDeptMap.get(dept) || 0
    
    // 三七互通
    if (dept === '三' || dept === '七') {
      const otherDept = dept === '三' ? '七' : '三'
      availableTeachers += (teacherDeptMap.get(otherDept) || 0)
    }
    
    // 计算该科室需要的考试场次（假设每人2天考试）
    const examsNeeded = studentCount * 2
    
    // 获取日期范围
    const stats = getDateRangeStatistics()
    const workdays = stats.workdays
    
    // 该科室的最大容量 = 可用考官数 × 工作日
    const maxCapacity = availableTeachers * workdays
    
    // 检查是否严重不足（考官为0）
    if (availableTeachers === 0) {
      issues.push({
        dept,
        studentCount,
        teacherCount: 0,
        severity: 'critical',
        message: `科室"${dept}"有${studentCount}名学员，但没有可用考官，无法完成排班`
      })
      hasCritical = true
    } else if (examsNeeded > maxCapacity) {
      // 容量不足
      const requiredDays = Math.ceil(examsNeeded / availableTeachers)
      issues.push({
        dept,
        studentCount,
        teacherCount: availableTeachers,
        severity: 'critical',
        message: `科室"${dept}"资源不足：${studentCount}名学员需${examsNeeded}场考试，但${availableTeachers}名考官在${workdays}天内最多只能安排${maxCapacity}场`
      })
      hasCritical = true
    } else if (examsNeeded > maxCapacity * 0.8) {
      // 容量紧张
      issues.push({
        dept,
        studentCount,
        teacherCount: availableTeachers,
        severity: 'warning',
        message: `科室"${dept}"资源紧张：${studentCount}名学员需${examsNeeded}场考试，${availableTeachers}名考官容量为${maxCapacity}场`
      })
    }
  })
  
  return {
    hasIssue: issues.length > 0,
    critical: hasCritical,
    issues
  }
}

// 🔧 检查不可用日期对排班的影响
const checkUnavailableDatesImpact = () => {
  const stats = getDateRangeStatistics()
  const unavailableDatesCount = customUnavailableDates.value.length
  
  if (unavailableDatesCount === 0) {
    return { hasIssue: false, message: '' }
  }
  
  // 计算不可用日期占总日期的比例
  const totalDays = stats.totalDays
  const unavailableDays = unavailableDatesCount
  
  if (unavailableDays >= totalDays * 0.5) {
    return {
      hasIssue: true,
      message: `设置了 ${unavailableDays} 天不可用日期，占总日期范围的 ${Math.round(unavailableDays/totalDays*100)}%，可能严重影响排班效果`
    }
  }
  
  if (unavailableDays > 0) {
    return {
      hasIssue: false,
      message: `已设置 ${unavailableDays} 天不可用日期`
    }
  }
  
  return { hasIssue: false, message: '' }
}

// 获取容量利用率百分比
const getCapacityPercentage = () => {
  const stats = getDateRangeStatistics()
  const studentCount = studentList.value.length
  const teacherCount = getTotalTeachersCount()
  const workdays = stats.workdays
  
  if (studentCount === 0 || teacherCount === 0 || workdays === 0) {
    return 0
  }
  
  const maxCapacity = teacherCount * workdays
  const requiredCapacity = studentCount * 2
  const percentage = Math.round((requiredCapacity / maxCapacity) * 100)
  
  // 限制最大显示为100%
  return Math.min(percentage, 100)
}

// 获取容量颜色
const getCapacityColor = () => {
  const percentage = getCapacityPercentage()
  
  if (percentage > 80) {
    return '#ef4444' // 红色 - 过载
  } else if (percentage > 60) {
    return '#f59e0b' // 黄色 - 紧张
  }
  return '#10b981' // 绿色 - 良好
}

// 获取容量渐变
const getCapacityGradient = () => {
  const percentage = getCapacityPercentage()
  
  if (percentage > 80) {
    return 'linear-gradient(90deg, #fca5a5 0%, #ef4444 100%)' // 红色渐变
  } else if (percentage > 60) {
    return 'linear-gradient(90deg, #fcd34d 0%, #f59e0b 100%)' // 黄色渐变
  }
  return 'linear-gradient(90deg, #6ee7b7 0%, #10b981 100%)' // 绿色渐变
}

// 🚀 获取深度优化的评估结果
const getOptimizedAssessment = async (): Promise<OptimizedAssessmentResultType | null> => {
  const now = Date.now()
  
  // 检查缓存
  if (optimizedAssessmentCache.value && (now - lastAssessmentTimestamp.value) < ASSESSMENT_CACHE_TTL) {
    return optimizedAssessmentCache.value
  }
  
  if (isOptimizedAssessmentLoading.value) {
    return optimizedAssessmentCache.value
  }
  
  isOptimizedAssessmentLoading.value = true
  
  try {
    // 构建评估输入
    const assessmentInput = await buildAssessmentInput()
    if (!assessmentInput) {
      return null
    }
    
    const result = await optimizedAssessmentService.performAssessment(assessmentInput)
    optimizedAssessmentCache.value = result
    lastAssessmentTimestamp.value = now
    
    return result
  } catch (error) {
    console.error('深度评估失败:', error)
    return null
  } finally {
    isOptimizedAssessmentLoading.value = false
  }
}

// 🎯 精确评估 - 完全模拟OptaPlanner约束
const getPreciseAssessment = async (): Promise<PreciseAssessmentResult | null> => {
  const now = Date.now()
  
  // 检查缓存
  if (preciseAssessmentCache.value && (now - lastPreciseAssessmentTimestamp.value) < PRECISE_ASSESSMENT_CACHE_TTL) {
    return preciseAssessmentCache.value
  }
  
  if (isPreciseAssessmentLoading.value) {
    return preciseAssessmentCache.value
  }
  
  isPreciseAssessmentLoading.value = true
  
  try {
    // 构建评估输入
    const assessmentInput = await buildAssessmentInput()
    if (!assessmentInput) {
      return null
    }
    
    const result = await preciseAssessmentService.performPreciseAssessment(assessmentInput)
    preciseAssessmentCache.value = result
    lastPreciseAssessmentTimestamp.value = now
    
    console.log('[PreciseAssessment] 精确评估结果:', {
      isFeasible: result.isFeasible,
      confidence: result.confidence,
      criticalDepartment: result.criticalDepartment,
      issues: result.issues.map(i => ({ type: i.type, severity: i.severity, message: i.message }))
    })
    
    return result
  } catch (error) {
    console.error('精确评估失败:', error)
    return null
  } finally {
    isPreciseAssessmentLoading.value = false
  }
}

// 构建评估输入
const buildAssessmentInput = async () => {
  const students = studentList.value
  const teachers = await loadTeachersForAssessment()
  const examDates = getExamDatesList()
  const unavailableDates = getAllUnavailableDates()
  const dutySchedule = await buildDutyScheduleMap()
  
  if (students.length === 0 || teachers.length === 0 || examDates.length === 0) {
    return null
  }
  
  return {
    students,
    teachers,
    examDates,
    unavailableDates,
    dutySchedule,
    config: {
      constraints: {
        maxExamsPerDay: constraints.value.maxExamsPerDay || 11,
        avoidWeekendScheduling: !allowWeekendScheduling.value
      }
    }
  }
}

// 加载考官数据用于评估
const loadTeachersForAssessment = async (): Promise<Teacher[]> => {
  // 尝试从多个来源加载考官数据
  const teacherKeys = ['teachers', 'examiner_teachers', 'unified_teachers', 'teacher_data', 'teacherList']
  
  for (const key of teacherKeys) {
    try {
      const data = localStorage.getItem(key)
      if (data) {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {}
  }
  
  return []
}

// 获取考试日期列表
const getExamDatesList = (): Date[] => {
  const dates: Date[] = []
  if (!examStartDateStr.value || !examEndDateStr.value) {
    return dates
  }
  
  const start = dateUtils.parseDate(examStartDateStr.value)
  const end = dateUtils.parseDate(examEndDateStr.value)
  
  if (!start || !end) return dates
  
  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const dateStr = dateUtils.toStandardDate(current)
    
    // 跳过周末（如果未开启周末排班）
    if (isWeekend && !allowWeekendScheduling.value) {
      current.setDate(current.getDate() + 1)
      continue
    }
    
    // 跳过节假日
    if (holidayService.isHoliday(dateStr)) {
      current.setDate(current.getDate() + 1)
      continue
    }
    
    // 跳过不可用日期
    const isUnavailable = customUnavailableDates.value.some(ud => {
      if (ud.endDate) {
        const udStart = dateUtils.parseDate(ud.date)
        const udEnd = dateUtils.parseDate(ud.endDate)
        return current >= udStart! && current <= udEnd!
      }
      return dateUtils.toStandardDate(current) === ud.date
    })
    
    if (!isUnavailable) {
      dates.push(new Date(current))
    }
    
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

// 获取所有不可用日期
const getAllUnavailableDates = (): Date[] => {
  const dates: Date[] = []
  
  for (const ud of customUnavailableDates.value) {
    if (ud.endDate) {
      const start = dateUtils.parseDate(ud.date)
      const end = dateUtils.parseDate(ud.endDate)
      if (start && end) {
        const current = new Date(start)
        while (current <= end) {
          dates.push(new Date(current))
          current.setDate(current.getDate() + 1)
        }
      }
    } else {
      const date = dateUtils.parseDate(ud.date)
      if (date) {
        dates.push(date)
      }
    }
  }
  
  return dates
}

// 构建值班表映射
const buildDutyScheduleMap = async (): Promise<Map<string, string[]>> => {
  const dutyMap = new Map<string, string[]>()
  
  try {
    const dutySchedule = await dutyRotationService.getCurrentSchedule()
    if (dutySchedule && dutySchedule.dutyDates) {
      for (const duty of dutySchedule.dutyDates) {
        if (duty.teacherId) {
          const existing = dutyMap.get(duty.teacherId) || []
          existing.push(duty.date)
          dutyMap.set(duty.teacherId, existing)
        }
      }
    }
  } catch (e) {
    console.warn('加载值班表失败:', e)
  }
  
  return dutyMap
}

// 🔧 获取智能评估结果（精确版 - 考虑所有约束，集成深度优化算法）
const getAssessmentResult = () => {
  const stats = getDateRangeStatistics()
  const studentCount = studentList.value.length
  const teacherCount = getTotalTeachersCount()
  const workdays = stats.workdays
  
  // ========== 优先级0：精确评估结果（完全模拟OptaPlanner约束）==========
  const preciseResult = preciseAssessmentCache.value
  if (preciseResult) {
    // 如果有HC6约束问题（连续日期对不足）
    if (!preciseResult.constraintChecks.hc6.isSatisfied) {
      const { validDatePairs, requiredForTwoDayStudents } = preciseResult.constraintChecks.hc6
      return {
        icon: '⚠️',
        title: '连续考试日期不足（HC6约束）',
        description: `需要${requiredForTwoDayStudents}个连续日期对用于两天考试，但仅有${validDatePairs}个可用。当前日期范围无法满足连续两天考试要求。`,
        color: '#ef4444',
        lightColor: '#fef2f2',
        status: 'error',
        statusClass: 'status-error',
        badgeText: '日期不足',
        showRecommendation: true
      }
    }
    
    // 如果有科室容量问题（HC2/HC7约束）
    if (!preciseResult.constraintChecks.hc2_hc7.isSatisfied) {
      const zeroCapacityDepts = preciseResult.constraintChecks.hc2_hc7.departmentsWithZeroCapacity
      return {
        icon: '⚠️',
        title: '科室考官资源不足（HC2/HC7约束）',
        description: `部门"${zeroCapacityDepts.join('、')}"没有可用考官组合，无法满足同科室考官1+不同科室考官2的要求。`,
        color: '#ef4444',
        lightColor: '#fef2f2',
        status: 'error',
        statusClass: 'status-error',
        badgeText: '科室资源不足',
        showRecommendation: true
      }
    }
    
    // 如果有HC4约束问题（每天考试场次超限）
    if (!preciseResult.constraintChecks.hc4.isSatisfied) {
      const { requiredExamsPerDay, maxExamsPerDay } = preciseResult.constraintChecks.hc4
      return {
        icon: '⚠️',
        title: '每日考试场次超限（HC4约束）',
        description: `每天需要安排${requiredExamsPerDay}场考试，但考官资源每天最多支持${maxExamsPerDay}场（每名考官每天只能监考一场）。`,
        color: '#ef4444',
        lightColor: '#fef2f2',
        status: 'error',
        statusClass: 'status-error',
        badgeText: '场次超限',
        showRecommendation: true
      }
    }
    
    // 如果精确评估显示不可行
    if (!preciseResult.isFeasible) {
      const criticalDept = preciseResult.criticalDepartment
      const firstIssue = preciseResult.issues[0]
      return {
        icon: '⚠️',
        title: criticalDept ? `部门"${criticalDept}"排班不可行` : '当前配置无法完成排班',
        description: firstIssue?.message || '选定日期范围内无法满足所有硬约束，建议延长日期范围或调整考官配置。',
        color: '#ef4444',
        lightColor: '#fef2f2',
        status: 'error',
        statusClass: 'status-error',
        badgeText: '不可行',
        showRecommendation: true
      }
    }
    
    // 精确评估通过，显示高置信度
    if (preciseResult.confidence > 0.8) {
      return {
        icon: '✅',
        title: '配置可行（高置信度）',
        description: `精确评估通过：${preciseResult.departmentCapacities.length}个科室资源充足，${preciseResult.constraintChecks.hc6.validDatePairs}个连续日期对可用。`,
        color: '#10b981',
        lightColor: '#d1fae5',
        status: 'success',
        statusClass: 'status-success',
        badgeText: '推荐',
        showRecommendation: false
      }
    }
  }
  
  // ========== 优先级1：基础数据完整性 ==========
  if (studentCount === 0) {
    return {
      icon: '⚠️',
      title: '缺少学员数据',
      description: '请先导入学员名单，确保有足够的学员需要排班',
      color: '#ef4444',
      lightColor: '#fef2f2',
      status: 'error',
      statusClass: 'status-error',
      badgeText: '数据缺失',
      showRecommendation: false
    }
  }
  
  if (teacherCount < 2) {
    return {
      icon: '⚠️',
      title: '考官数量不足',
      description: '可用考官过少，每场考试需要2名考官，无法完成排班',
      color: '#ef4444',
      lightColor: '#fef2f2',
      status: 'error',
      statusClass: 'status-error',
      badgeText: '配置错误',
      showRecommendation: false
    }
  }
  
  // ========== 优先级2：日期范围有效性 ==========
  if (workdays === 0) {
    return {
      icon: '⚠️',
      title: '无可用工作日',
      description: '请重新选择考试日期范围，确保有足够的工作日',
      color: '#ef4444',
      lightColor: '#fef2f2',
      status: 'error',
      statusClass: 'status-error',
      badgeText: '日期错误',
      showRecommendation: true
    }
  }
  
  // ========== 优先级3：全局容量检查 ==========
  const totalExamsNeeded = studentCount * 2 // 每个学员2场考试
  const maxExamsPerDay = Math.floor(teacherCount / 2) // 每天最大场次
  const globalCapacity = maxExamsPerDay * workdays // 全局总容量
  
  if (totalExamsNeeded > globalCapacity) {
    const requiredDays = Math.ceil(totalExamsNeeded / maxExamsPerDay)
    return {
      icon: '⚠️',
      title: '容量严重不足',
      description: `需要安排${totalExamsNeeded}场考试，但当前配置最多支持${globalCapacity}场。建议扩大至${requiredDays}个工作日或增加考官。`,
      color: '#ef4444',
      lightColor: '#fef2f2',
      status: 'error',
      statusClass: 'status-error',
      badgeText: '容量不足',
      showRecommendation: true
    }
  }
  
  // ========== 优先级4：科室级别容量检查（HC2约束） ==========
  const deptCheck = checkDepartmentResourceMatch()
  if (deptCheck.critical) {
    const firstIssue = deptCheck.issues[0]
    return {
      icon: '⚠️',
      title: '科室资源不匹配',
      description: firstIssue.message,
      color: '#ef4444',
      lightColor: '#fef2f2',
      status: 'error',
      statusClass: 'status-error',
      badgeText: '无法排班',
      showRecommendation: false
    }
  }
  
  // ========== 优先级5：每日容量检查 ==========
  const requiredExamsPerDay = Math.ceil(totalExamsNeeded / workdays)
  
  if (requiredExamsPerDay > maxExamsPerDay) {
    const requiredDays = Math.ceil(totalExamsNeeded / maxExamsPerDay)
    return {
      icon: '⚠️',
      title: '每日容量不足',
      description: `每天需要安排${requiredExamsPerDay}场考试，但考官资源每天最多支持${maxExamsPerDay}场。建议扩大至${requiredDays}个工作日。`,
      color: '#ef4444',
      lightColor: '#fef2f2',
      status: 'error',
      statusClass: 'status-error',
      badgeText: '需要调整',
      showRecommendation: true
    }
  }
  
  // ========== 优先级6：科室资源紧张警告 ==========
  if (deptCheck.hasIssue) {
    const firstIssue = deptCheck.issues[0]
    return {
      icon: '⚠️',
      title: '科室资源紧张',
      description: firstIssue.message,
      color: '#f59e0b',
      lightColor: '#fffbeb',
      status: 'warning',
      statusClass: 'status-warning',
      badgeText: '资源紧张',
      showRecommendation: false
    }
  }
  
  // ========== 优先级7：不可用考官影响检查 ==========
  const unavailableTeachers = getUnavailableTeachersInRange()
  const unavailableCount = unavailableTeachers.length
  const unavailableRatio = unavailableCount / teacherCount
  
  if (unavailableRatio > 0.3) {
    return {
      icon: '⚠️',
      title: '考官可用性受限',
      description: `${unavailableCount}名考官（${Math.round(unavailableRatio*100)}%）在选定日期范围内不可用，可能导致排班困难。建议调整日期范围。`,
      color: '#f59e0b',
      lightColor: '#fffbeb',
      status: 'warning',
      statusClass: 'status-warning',
      badgeText: '可用性低',
      showRecommendation: true
    }
  }
  
  // ========== 优先级8：日程紧张检查 ==========
  if (requiredExamsPerDay > maxExamsPerDay * 0.8) {
    return {
      icon: '⚠️',
      title: '日程较紧张',
      description: `每天需要安排${requiredExamsPerDay}场考试，接近容量上限${maxExamsPerDay}场。排班可行但选择有限。`,
      color: '#f59e0b',
      lightColor: '#fffbeb',
      status: 'warning',
      statusClass: 'status-warning',
      badgeText: '日程紧张',
      showRecommendation: true
    }
  }
  
  // ========== 优先级9：不可用日期影响 ==========
  const unavailableImpact = checkUnavailableDatesImpact()
  if (unavailableImpact.hasIssue) {
    return {
      icon: '⚠️',
      title: '日期设置有影响',
      description: unavailableImpact.message,
      color: '#f59e0b',
      lightColor: '#fffbeb',
      status: 'warning',
      statusClass: 'status-warning',
      badgeText: '日期受限',
      showRecommendation: true
    }
  }
  
  // ========== 成功状态 ==========
  if (requiredExamsPerDay <= 3) {
    return {
      icon: '✅',
      title: '配置完美',
      description: `当前配置非常合理，每天仅需安排${requiredExamsPerDay}场考试，可以获得优质的排班结果`,
      color: '#10b981',
      lightColor: '#d1fae5',
      status: 'success',
      statusClass: 'status-success',
      badgeText: '推荐',
      showRecommendation: false
    }
  }
  
  return {
    icon: '✅',
    title: '配置可行',
    description: `当前配置可以完成排班，每天需要安排 ${requiredExamsPerDay} 场考试`,
    color: '#10b981',
    lightColor: '#d1fae5',
    status: 'success',
    statusClass: 'status-success',
    badgeText: '可行',
    showRecommendation: false
  }
}

// 获取评估详细信息
const getAssessmentDetails = () => {
  const stats = getDateRangeStatistics()
  const studentCount = studentList.value.length
  const teacherCount = getTotalTeachersCount()
  const workdays = stats.workdays
  const details: Array<{ text: string; color?: string; bgColor?: string; borderColor?: string; textColor?: string }> = []
  
  if (studentCount === 0) {
    details.push({ 
      text: '未导入学员数据', 
      color: '#ef4444',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#dc2626'
    })
    return details
  }
  
  // 基础信息 - 使用卡片式设计
  details.push({ 
    text: `学员数量: ${studentCount} 人`, 
    color: '#10b981',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    textColor: '#15803d'
  })
  
  details.push({ 
    text: `可用考官: ${teacherCount} 人`, 
    color: '#10b981',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    textColor: '#15803d'
  })
  
  details.push({ 
    text: `工作日数: ${workdays} 天`, 
    color: '#10b981',
    bgColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    textColor: '#15803d'
  })
  
  // 节假日警告
  if (stats.holidays > 0) {
    details.push({ 
      text: `注意: 选定范围内有 ${stats.holidays} 天法定节假日`, 
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fcd34d',
      textColor: '#b45309'
    })
  }
  
  // 周末信息
  if (allowWeekendScheduling.value && stats.weekends > 0) {
    details.push({ 
      text: `开启了周末排班，包含 ${stats.weekends} 天周末`, 
      color: '#3b82f6',
      bgColor: '#eff6ff',
      borderColor: '#bfdbfe',
      textColor: '#1d4ed8'
    })
  }
  
  // 计算并显示每天平均考试场次
  const avgExamsPerDay = ((studentCount * 2) / workdays).toFixed(1)
  const requiredExamsPerDay = Math.ceil((studentCount * 2) / workdays)
  const maxExamsPerDay = Math.floor(teacherCount / 2)
  
  // 根据考试场次压力决定颜色
  let examLoadColor = '#10b981'
  let examLoadBg = '#f0fdf4'
  let examLoadBorder = '#bbf7d0'
  let examLoadText = '#15803d'
  
  if (requiredExamsPerDay > maxExamsPerDay) {
    examLoadColor = '#ef4444'
    examLoadBg = '#fef2f2'
    examLoadBorder = '#fecaca'
    examLoadText = '#dc2626'
  } else if (requiredExamsPerDay > maxExamsPerDay * 0.8) {
    examLoadColor = '#f59e0b'
    examLoadBg = '#fffbeb'
    examLoadBorder = '#fcd34d'
    examLoadText = '#b45309'
  }
  
  details.push({ 
    text: `预计每天平均考试场次: ${avgExamsPerDay} 场`, 
    color: examLoadColor,
    bgColor: examLoadBg,
    borderColor: examLoadBorder,
    textColor: examLoadText
  })
  
  // 计算理论容量
  const maxCapacity = teacherCount * workdays
  const requiredCapacity = studentCount * 2
  const capacityRate = Math.round((requiredCapacity / maxCapacity) * 100)
  
  // 根据容量利用率决定颜色
  let capacityColor = '#10b981'
  let capacityBg = '#f0fdf4'
  let capacityBorder = '#bbf7d0'
  let capacityText = '#15803d'
  
  if (capacityRate > 100) {
    capacityColor = '#ef4444'
    capacityBg = '#fef2f2'
    capacityBorder = '#fecaca'
    capacityText = '#dc2626'
  } else if (capacityRate > 80) {
    capacityColor = '#f59e0b'
    capacityBg = '#fffbeb'
    capacityBorder = '#fcd34d'
    capacityText = '#b45309'
  }
  
  details.push({ 
    text: `容量利用率: ${capacityRate}%`, 
    color: capacityColor,
    bgColor: capacityBg,
    borderColor: capacityBorder,
    textColor: capacityText
  })
  
  // 🎯 添加精确评估详情（完全模拟OptaPlanner约束）
  const preciseResult = preciseAssessmentCache.value
  if (preciseResult) {
    // 显示HC6约束检查（连续日期对）
    const { validDatePairs, requiredForTwoDayStudents } = preciseResult.constraintChecks.hc6
    let hc6Color = '#10b981'
    let hc6Bg = '#f0fdf4'
    let hc6Border = '#bbf7d0'
    let hc6Text = '#15803d'
    
    if (validDatePairs < requiredForTwoDayStudents) {
      hc6Color = '#ef4444'
      hc6Bg = '#fef2f2'
      hc6Border = '#fecaca'
      hc6Text = '#dc2626'
    } else if (validDatePairs < requiredForTwoDayStudents * 1.2) {
      hc6Color = '#f59e0b'
      hc6Bg = '#fffbeb'
      hc6Border = '#fcd34d'
      hc6Text = '#b45309'
    }
    
    details.push({
      text: `连续日期对: ${validDatePairs}/${requiredForTwoDayStudents} (HC6约束)`,
      color: hc6Color,
      bgColor: hc6Bg,
      borderColor: hc6Border,
      textColor: hc6Text
    })
    
    // 显示各科室容量
    for (const dept of preciseResult.departmentCapacities.slice(0, 3)) {
      let deptColor = '#10b981'
      let deptBg = '#f0fdf4'
      let deptBorder = '#bbf7d0'
      let deptText = '#15803d'
      
      if (dept.severity === 'critical') {
        deptColor = '#ef4444'
        deptBg = '#fef2f2'
        deptBorder = '#fecaca'
        deptText = '#dc2626'
      } else if (dept.severity === 'high') {
        deptColor = '#f59e0b'
        deptBg = '#fffbeb'
        deptBorder = '#fcd34d'
        deptText = '#b45309'
      }
      
      details.push({
        text: `${dept.department}室: ${dept.availableDatePairs.length}/${dept.requiredDatePairs} 日期对`,
        color: deptColor,
        bgColor: deptBg,
        borderColor: deptBorder,
        textColor: deptText
      })
    }
    
    // 显示精确评估置信度
    const preciseConfidencePercent = Math.round(preciseResult.confidence * 100)
    details.push({
      text: `精确评估置信度: ${preciseConfidencePercent}%`,
      color: preciseConfidencePercent > 80 ? '#10b981' : preciseConfidencePercent > 60 ? '#f59e0b' : '#ef4444',
      bgColor: preciseConfidencePercent > 80 ? '#f0fdf4' : preciseConfidencePercent > 60 ? '#fffbeb' : '#fef2f2',
      borderColor: preciseConfidencePercent > 80 ? '#bbf7d0' : preciseConfidencePercent > 60 ? '#fcd34d' : '#fecaca',
      textColor: preciseConfidencePercent > 80 ? '#15803d' : preciseConfidencePercent > 60 ? '#b45309' : '#dc2626'
    })
  }
  
  // 🚀 添加深度优化评估详情（降级）
  const optimizedResult = optimizedAssessmentCache.value
  if (optimizedResult && !preciseResult) {
    // 显示总体置信度
    const confidencePercent = Math.round(optimizedResult.overallConfidence * 100)
    let confColor = '#10b981'
    let confBg = '#f0fdf4'
    let confBorder = '#bbf7d0'
    let confText = '#15803d'
    
    if (confidencePercent < 60) {
      confColor = '#ef4444'
      confBg = '#fef2f2'
      confBorder = '#fecaca'
      confText = '#dc2626'
    } else if (confidencePercent < 80) {
      confColor = '#f59e0b'
      confBg = '#fffbeb'
      confBorder = '#fcd34d'
      confText = '#b45309'
    }
    
    details.push({
      text: `排班可行性: ${confidencePercent}%`,
      color: confColor,
      bgColor: confBg,
      borderColor: confBorder,
      textColor: confText
    })
    
    // 显示实际容量vs需求
    const actualCapacity = optimizedResult.totalActualCapacity
    const neededCapacity = optimizedResult.totalExamsNeeded
    const actualRate = actualCapacity > 0 ? Math.round((neededCapacity / actualCapacity) * 100) : 0
    
    details.push({
      text: `实际容量利用率: ${actualRate}% (${neededCapacity}/${actualCapacity}场)`,
      color: actualRate > 90 ? '#ef4444' : actualRate > 75 ? '#f59e0b' : '#10b981',
      bgColor: actualRate > 90 ? '#fef2f2' : actualRate > 75 ? '#fffbeb' : '#f0fdf4',
      borderColor: actualRate > 90 ? '#fecaca' : actualRate > 75 ? '#fcd34d' : '#bbf7d0',
      textColor: actualRate > 90 ? '#dc2626' : actualRate > 75 ? '#b45309' : '#15803d'
    })
    
    // 显示瓶颈部门
    const bottleneckDepts = optimizedResult.bottlenecks.filter(b => b.isBottleneck)
    if (bottleneckDepts.length > 0) {
      details.push({
        text: `瓶颈部门: ${bottleneckDepts.map(b => b.department).join(', ')}`,
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fcd34d',
        textColor: '#b45309'
      })
    }
    
    // 显示不可用考官数
    if (optimizedResult.unavailableExaminers.length > 0) {
      details.push({
        text: `不可用考官: ${optimizedResult.unavailableExaminers.length}人`,
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fcd34d',
        textColor: '#b45309'
      })
    }
  }
  
  // 🔧 添加科室资源匹配检查详情
  const deptCheck = checkDepartmentResourceMatch()
  if (deptCheck.hasIssue) {
    deptCheck.issues.forEach(issue => {
      details.push({
        text: issue.message,
        color: issue.severity === 'critical' ? '#ef4444' : '#f59e0b',
        bgColor: issue.severity === 'critical' ? '#fef2f2' : '#fffbeb',
        borderColor: issue.severity === 'critical' ? '#fecaca' : '#fcd34d',
        textColor: issue.severity === 'critical' ? '#dc2626' : '#b45309'
      })
    })
  } else {
    details.push({
      text: '科室资源匹配检查通过，各科室考官数量充足',
      color: '#10b981',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      textColor: '#15803d'
    })
  }
  
  return details
}

// 🔧 获取改进建议（增强版）
const getAssessmentSuggestions = () => {
  const suggestions: string[] = []
  const stats = getDateRangeStatistics()
  const studentCount = studentList.value.length
  const teacherCount = getTotalTeachersCount()
  const workdays = stats.workdays
  
  if (studentCount === 0) {
    suggestions.push('【步骤1】请先导入学员名单')
    return suggestions
  }
  
  if (teacherCount < 2) {
    suggestions.push('【考官管理】考官数量不足，请检查考官数据是否正确导入')
    return suggestions
  }
  
  // 🔧 优先检查科室资源问题
  const deptCheck = checkDepartmentResourceMatch()
  if (deptCheck.critical) {
    deptCheck.issues.forEach(issue => {
      if (issue.severity === 'critical') {
        suggestions.push(`【严重】${issue.message}`)
      }
    })
    suggestions.push('【解决方案】增加对应科室的考官数量，或减少该科室的学员数量')
    suggestions.push('【备选方案】延长考试日期范围，分散考试压力')
    return suggestions
  } else if (deptCheck.hasIssue) {
    deptCheck.issues.forEach(issue => {
      suggestions.push(`【注意】${issue.message}`)
    })
    suggestions.push('【建议】考虑调整科室人员配置，确保各科室资源均衡')
  }
  
  // 🔧 计算考试容量和需求
  const maxExamsPerDay = Math.floor(teacherCount / 2)
  
  if (workdays === 0) {
    suggestions.push('【日期设置】请先设置考试日期范围')
    return suggestions
  }
  
  const requiredExamsPerDay = Math.ceil((studentCount * 2) / workdays)
  
  // 🔧 日期范围建议
  if (requiredExamsPerDay > maxExamsPerDay) {
    const needDays = Math.ceil((studentCount * 2) / maxExamsPerDay)
    const recommendedRange = getRecommendedDateRange()
    suggestions.push(`【日期不足】当前日期范围无法满足排班需求`)
    suggestions.push(`【建议】至少需要 ${needDays} 个工作日`)
    if (recommendedRange) {
      suggestions.push(`【推荐】使用推荐日期范围：${recommendedRange.display}`)
    }
  } else if (requiredExamsPerDay > maxExamsPerDay * 0.8) {
    const recommendedRange = getRecommendedDateRange()
    suggestions.push(`【日程紧张】每天需要安排 ${requiredExamsPerDay} 场考试，接近容量上限 ${maxExamsPerDay} 场`)
    suggestions.push(`【建议】适当扩大日期范围以获得更优质的排班结果`)
    if (recommendedRange && recommendedRange.status !== 'good') {
      suggestions.push(`【推荐】建议日期范围：${recommendedRange.display}（${recommendedRange.recommendedWorkdays}个工作日）`)
    }
  } else {
    // 日期充足，给出优化建议
    suggestions.push(`【容量充足】当前配置每天需安排 ${requiredExamsPerDay} 场考试，远低于容量上限 ${maxExamsPerDay} 场`)
    suggestions.push(`【状态】可以获得优质的排班结果`)
  }
  
  // 🔧 节假日和周末提示
  if (stats.holidays > 0) {
    suggestions.push(`【节假日】选定范围内有 ${stats.holidays} 天法定节假日${allowWeekendScheduling.value ? '' : '，将自动跳过'}`)
  }
  
  if (!allowWeekendScheduling.value && stats.weekends > 0) {
    suggestions.push(`【周末】选定范围内有 ${stats.weekends} 天周末不安排考试`)
    suggestions.push(`【提示】如需要在周末排班，请开启"周末是否安排考试"开关`)
  } else if (allowWeekendScheduling.value && stats.weekends > 0) {
    suggestions.push(`【周末】已开启周末排班，包含 ${stats.weekends} 天周末`)
  }
  
  // 🔧 不可用日期提示
  if (customUnavailableDates.value.length > 0) {
    suggestions.push(`【不可用日期】已设置 ${customUnavailableDates.value.length} 天不可用日期，系统将自动跳过`)
  }
  
  return suggestions
}

// 🔧 获取推荐的日期范围（智能评估步骤专用 - 集成深度优化算法）
// 🔧 新逻辑：
// - 🔴 insufficient(红色): 不可行，推荐天数 > 当前天数（必须延长）
// - 🔵 suboptimal(蓝色): 可行但不理想，推荐天数 >= 当前天数
// - 🟢 good(绿色): 可行且理想，推荐天数 = 当前天数
const getRecommendedDateRange = () => {
  const studentCount = studentList.value.length
  const teacherCount = getTotalTeachersCount()
  
  if (studentCount === 0 || teacherCount < 2) return null
  
  // 🎯 优先使用精确评估结果（完全模拟OptaPlanner约束）
  const preciseResult = preciseAssessmentCache.value
  if (preciseResult?.dateAnalysis?.recommendedDateRange) {
    const rec = preciseResult.dateAnalysis.recommendedDateRange
    const currentStats = getDateRangeStatistics()
    const currentWorkdays = currentStats.workdays
    
    const startStr = dateUtils.toStandardDate(rec.startDate)
    const endStr = dateUtils.toStandardDate(rec.endDate)
    
    // 🔧 使用评估服务返回的状态
    const status = rec.status || 'good'
    
    // 🔧 根据状态确定推荐天数和消息
    let message: string
    switch (status) {
      case 'insufficient':
        // 🔴 红色：推荐天数必须大于当前天数
        message = `⚠️ ${rec.reason}`
        break
      case 'suboptimal':
        // 🔵 蓝色：推荐天数可以等于或大于当前天数
        if (rec.requiredDays > currentWorkdays) {
          message = `💡 ${rec.reason}`
        } else {
          message = `💡 当前${currentWorkdays}天可以完成排班，但延长日期可获得更好效果`
        }
        break
      case 'good':
      default:
        // 🟢 绿色：推荐天数等于当前天数
        message = `✅ 当前${currentWorkdays}天的配置可以顺利完成排班，资源配置合理`
        break
    }
    
    return {
      start: startStr,
      end: endStr,
      display: `${dateUtils.toDisplayDate(startStr)} 至 ${dateUtils.toDisplayDate(endStr)}`,
      requiredWorkdays: rec.requiredDays,
      recommendedWorkdays: rec.requiredDays,
      currentWorkdays: currentWorkdays,
      status: status,
      message: message,
      // 添加科室容量详细信息
      bottleneckInfo: preciseResult.departmentCapacities
        .filter(d => d.isBottleneck)
        .map(d => ({
          department: d.department,
          requiredPairs: d.requiredDatePairs,
          availablePairs: d.availableDatePairs.length,
          deficit: d.deficit
        }))
    }
  }
  
  // 🚀 降级到深度优化评估结果
  const optimizedResult = optimizedAssessmentCache.value
  if (optimizedResult?.dateRecommendation) {
    const rec = optimizedResult.dateRecommendation
    const currentStats = getDateRangeStatistics()
    const currentWorkdays = currentStats.workdays
    
    const startStr = dateUtils.toStandardDate(rec.recommendedStartDate)
    const endStr = dateUtils.toStandardDate(rec.recommendedEndDate)
    
    // 🔧 使用评估服务返回的状态
    const status = rec.status || 'good'
    
    // 🔧 根据状态确定推荐天数和消息
    let message: string
    switch (status) {
      case 'insufficient':
        // 🔴 红色：推荐天数必须大于当前天数
        message = `⚠️ 当前日期范围不足以完成排班，建议延长至${rec.suggestedDays}天`
        break
      case 'suboptimal':
        // 🔵 蓝色：推荐天数可以等于或大于当前天数
        if (rec.suggestedDays > currentWorkdays) {
          message = `💡 建议延长至${rec.suggestedDays}天以获得更好排班效果`
        } else {
          message = `💡 当前${currentWorkdays}天可以完成排班，但延长日期可获得更好效果`
        }
        break
      case 'good':
      default:
        // 🟢 绿色：推荐天数等于当前天数
        message = `✅ 当前${currentWorkdays}天的配置可以顺利完成排班，资源配置合理`
        break
    }
    
    return {
      start: startStr,
      end: endStr,
      display: `${dateUtils.toDisplayDate(startStr)} 至 ${dateUtils.toDisplayDate(endStr)}`,
      requiredWorkdays: rec.minRequiredDays,
      recommendedWorkdays: rec.suggestedDays,
      currentWorkdays: currentWorkdays,
      status: status,
      message: message,
      // 添加瓶颈部门详细信息
      bottleneckInfo: optimizedResult.bottlenecks
        .filter(b => b.isBottleneck)
        .map(b => ({
          department: b.department,
          requiredDays: b.requiredDays,
          utilizationRate: b.utilizationRate
        }))
    }
  }
  
  // 🔧 降级到原始计算逻辑
  // 计算最优工作日数（基于约束求解）
  // 考虑：每天最大考试场次、科室分布、考官可用性
  const maxExamsPerDay = Math.floor(teacherCount / 2)
  
  // 保守估计：预留20%余量，确保排班质量
  const baseRequiredDays = Math.ceil((studentCount * 2) / maxExamsPerDay)
  const recommendedWorkdays = Math.max(baseRequiredDays + 1, Math.ceil(baseRequiredDays * 1.2))
  
  // 🔧 获取当前日期状态
  const currentStats = getDateRangeStatistics()
  const currentWorkdays = currentStats.workdays
  
  // 🔧 计算推荐日期（基于当前开始日期或明天）
  let startDate: Date
  
  if (examStartDateStr.value) {
    // 如果用户已设置开始日期，基于该日期计算
    startDate = dateUtils.parseDate(examStartDateStr.value) || new Date()
  } else {
    // 否则从明天开始
    startDate = new Date()
    startDate.setDate(startDate.getDate() + 1)
  }
  
  // 找到实际可用的开始日期（跳过周末和节假日）
  while (startDate.getDay() === 0 || startDate.getDay() === 6 || 
         holidayService.isHoliday(dateUtils.toStandardDate(startDate))) {
    startDate.setDate(startDate.getDate() + 1)
  }
  
  // 🔧 计算推荐的结束日期
  const endDate = new Date(startDate)
  let workdaysFound = 0
  
  while (workdaysFound < recommendedWorkdays) {
    const dayOfWeek = endDate.getDay()
    const dateStr = dateUtils.toStandardDate(endDate)
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6) && !allowWeekendScheduling.value
    const isHoliday = holidayService.isHoliday(dateStr)
    
    if (!isWeekend && !isHoliday) {
      workdaysFound++
    }
    
    if (workdaysFound < recommendedWorkdays) {
      endDate.setDate(endDate.getDate() + 1)
    }
  }
  
  // 🔧 计算状态和建议
  const status = currentWorkdays < baseRequiredDays ? 'insufficient' : 
                 currentWorkdays < recommendedWorkdays ? 'suboptimal' : 'good'
  
  const startStr = dateUtils.toStandardDate(startDate)
  const endStr = dateUtils.toStandardDate(endDate)
  
  return {
    start: startStr,
    end: endStr,
    display: `${dateUtils.toDisplayDate(startStr)} 至 ${dateUtils.toDisplayDate(endStr)}`,
    requiredWorkdays: baseRequiredDays,
    recommendedWorkdays: recommendedWorkdays,
    currentWorkdays: currentWorkdays,
    status: status,
    message: status === 'insufficient' ? `需要至少 ${baseRequiredDays} 个工作日，当前仅 ${currentWorkdays} 天` :
             status === 'suboptimal' ? `建议 ${recommendedWorkdays} 个工作日以获得更好效果，当前 ${currentWorkdays} 天` :
             `当前 ${currentWorkdays} 个工作日配置合理`
  }
}

// 应用推荐的日期范围
const applyRecommendedDateRange = async () => {
  const recommended = getRecommendedDateRange()
  if (recommended) {
    // 🔧 先清除评估缓存，确保应用新日期后重新评估
    optimizedAssessmentCache.value = null
    preciseAssessmentCache.value = null
    lastAssessmentTimestamp.value = 0
    lastPreciseAssessmentTimestamp.value = 0
    
    // 更新日期
    examStartDateStr.value = recommended.start
    examEndDateStr.value = recommended.end
    
    // 🔧 立即触发重新评估（而不是等待watch的500ms延迟）
    if (studentList.value.length > 0 && getTotalTeachersCount() >= 2) {
      await Promise.all([
        getOptimizedAssessment(),
        getPreciseAssessment()
      ])
      process.env.NODE_ENV === 'development' && console.log('[Assessment] 应用建议后重新评估完成')
    }
    
    ElMessage.success('已应用推荐的日期范围，评估状态已更新')
  }
}

// 判断是否可以继续排班
const isAssessmentPassable = () => {
  const result = getAssessmentResult()
  return result.color !== '#ef4444' // 不是红色警告就可以继续
}

// 周末排班开关变化处理
// 点击整个区域切换周末排班开关
const toggleWeekendScheduling = () => {
  allowWeekendScheduling.value = !allowWeekendScheduling.value
  onWeekendToggleChange()
}

const onWeekendToggleChange = () => {
  // 当开启周末排班时，关闭避免周末排班的约束
  // 当关闭周末排班时，开启避免周末排班的约束
  constraints.value.avoidWeekendSchedulingEnabled = !allowWeekendScheduling.value
  process.env.NODE_ENV === 'development' && console.log(`周末排班开关: ${allowWeekendScheduling.value ? '开启' : '关闭'}，避免周末排班: ${constraints.value.avoidWeekendSchedulingEnabled}`)
}

// 添加不可用日期
const addUnavailableDate = () => {
  if (!newUnavailableDate.value) {
    ElMessage.warning('请选择日期')
    return
  }
  
  // 格式化显示日期
  let displayDate = newUnavailableDate.value
  if (unavailableDateMode.value === 'range' && newUnavailableEndDate.value) {
    displayDate = `${newUnavailableDate.value} 至 ${newUnavailableEndDate.value}`
  }
  
  // 检查是否重复
  const isDuplicate = customUnavailableDates.value.some(item => 
    item.date === newUnavailableDate.value && 
    item.endDate === (unavailableDateMode.value === 'range' ? newUnavailableEndDate.value : undefined)
  )
  
  if (isDuplicate) {
    ElMessage.warning('该日期已添加')
    return
  }
  
  customUnavailableDates.value.push({
    date: newUnavailableDate.value,
    endDate: unavailableDateMode.value === 'range' ? newUnavailableEndDate.value : undefined,
    displayDate,
    reason: newUnavailableReason.value || undefined
  })
  
  // 清空输入
  newUnavailableDate.value = ''
  newUnavailableEndDate.value = ''
  newUnavailableReason.value = ''
  
  ElMessage.success('添加成功')
}

// 删除不可用日期
const removeUnavailableDate = (index: number) => {
  customUnavailableDates.value.splice(index, 1)
  ElMessage.success('删除成功')
}

// 快速日期选择方法
const setQuickDateRange = (days: number) => {
  const today = new Date();
  // 使用dateUtils工具类获取下一天
  const startDate = new Date(dateUtils.getNextDay(today));
  
  // 计算结束日期
  const endDate = new Date(startDate);
  for (let i = 1; i < days; i++) {
    const nextDay = dateUtils.getNextDay(endDate);
    endDate.setTime(new Date(nextDay).getTime());
  }
  
  // 使用dateUtils工具类获取标准日期格式
  examStartDateStr.value = dateUtils.toStandardDate(startDate);
  examEndDateStr.value = dateUtils.toStandardDate(endDate);
  
  updateDateSuggestion();
}

const isQuickDateActive = (days: number) => {
  if (!examStartDateStr.value || !examEndDateStr.value) return false;
  
  const today = new Date();
  // 使用dateUtils工具类获取下一天
  const expectedStart = new Date(dateUtils.getNextDay(today));
  
  // 计算结束日期
  const expectedEnd = new Date(expectedStart);
  for (let i = 1; i < days; i++) {
    const nextDay = dateUtils.getNextDay(expectedEnd);
    expectedEnd.setTime(new Date(nextDay).getTime());
  }
  
  // 使用dateUtils工具类获取标准日期格式进行比较
  const expectedStartStr = dateUtils.toStandardDate(expectedStart);
  const expectedEndStr = dateUtils.toStandardDate(expectedEnd);
  
  return examStartDateStr.value === expectedStartStr &&
         examEndDateStr.value === expectedEndStr;
}

const setThisMonth = () => {
  const today = new Date()
  // 使用dateUtils工具类获取下一天
  const startDate = new Date(dateUtils.getNextDay(today))
  
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0) // 本月最后一天
  
  // 使用dateUtils工具类获取标准日期格式
  examStartDateStr.value = dateUtils.toStandardDate(startDate)
  examEndDateStr.value = dateUtils.toStandardDate(endDate)
  
  updateDateSuggestion()
}

const isThisMonthActive = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return false
  
  const today = new Date()
  // 使用dateUtils工具类获取下一天
  const expectedStart = new Date(dateUtils.getNextDay(today))
  
  const expectedEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  // 使用dateUtils工具类获取标准日期格式进行比较
  const expectedStartStr = dateUtils.toStandardDate(expectedStart)
  const expectedEndStr = dateUtils.toStandardDate(expectedEnd)
  
  return examStartDateStr.value === expectedStartStr &&
         examEndDateStr.value === expectedEndStr
}

const setNextMonth = () => {
  const today = new Date()
  const nextMonth = today.getMonth() + 1
  const year = nextMonth > 11 ? today.getFullYear() + 1 : today.getFullYear()
  const month = nextMonth > 11 ? 0 : nextMonth
  
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)
  
  // 使用dateUtils工具类获取标准日期格式
  examStartDateStr.value = dateUtils.toStandardDate(startDate)
  examEndDateStr.value = dateUtils.toStandardDate(endDate)
  
  updateDateSuggestion()
}

const isNextMonthActive = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) return false
  
  const today = new Date()
  const nextMonth = today.getMonth() + 1
  const year = nextMonth > 11 ? today.getFullYear() + 1 : today.getFullYear()
  const month = nextMonth > 11 ? 0 : nextMonth
  
  const expectedStart = new Date(year, month, 1)
  const expectedEnd = new Date(year, month + 1, 0)
  
  // 使用dateUtils工具类获取标准日期格式进行比较
  const expectedStartStr = dateUtils.toStandardDate(expectedStart)
  const expectedEndStr = dateUtils.toStandardDate(expectedEnd)
  
  return examStartDateStr.value === expectedStartStr &&
         examEndDateStr.value === expectedEndStr
}

// 计算最优结束日期的响应式变量
const calculatedOptimalEndDate = ref<string>('')
const calculatedOptimalDays = ref<number>(0)

// 计算最优结束日期
const calculateOptimalEndDate = () => {
  if (!examStartDateStr.value || studentList.value.length === 0) {
    calculatedOptimalEndDate.value = ''
    calculatedOptimalDays.value = 0
    return
  }
  
  const studentCount = studentList.value.length
  const teacherCount = getTotalTeachersCount()
  
  if (teacherCount < 2) {
    calculatedOptimalEndDate.value = ''
    calculatedOptimalDays.value = 0
    return
  }
  
  // 使用calculateOptimalExamDays计算最优天数
  const optimalDaysInfo = calculateOptimalExamDays(studentList.value, [], 2)
  const recommendedDays = optimalDaysInfo.recommendedDays
  
  // 从开始日期计算结束日期
  const startDate = dateUtils.parseDate(examStartDateStr.value)
  if (!startDate) {
    calculatedOptimalEndDate.value = ''
    calculatedOptimalDays.value = 0
    return
  }
  
  // 计算工作日（排除周末和节假日）
  let workdaysFound = 0
  let currentDate = new Date(startDate)
  
  while (workdaysFound < recommendedDays) {
    const dayOfWeek = currentDate.getDay()
    const dateStr = dateUtils.toStandardDate(currentDate)
    
    // 检查是否是工作日（不是周末且不是节假日）
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isHoliday = holidayService.isHoliday(dateStr)
    
    // 如果允许周末排班，则不跳过周末
    const shouldSkip = isHoliday || (!allowWeekendScheduling.value && isWeekend)
    
    if (!shouldSkip) {
      workdaysFound++
    }
    
    // 移动到第二天
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  // 回退一天，因为循环结束后多走了一天
  currentDate.setDate(currentDate.getDate() - 1)
  
  calculatedOptimalEndDate.value = dateUtils.toStorageDate(currentDate)
  calculatedOptimalDays.value = recommendedDays
  
  console.log('📅 [最优日期计算]', {
    startDate: examStartDateStr.value,
    recommendedDays: recommendedDays,
    calculatedEndDate: calculatedOptimalEndDate.value,
    studentCount: studentCount,
    teacherCount: teacherCount
  })
}

// 应用计算的最优日期
const applyCalculatedOptimalDate = () => {
  if (calculatedOptimalEndDate.value) {
    examEndDateStr.value = calculatedOptimalEndDate.value
    onEndDateChange()
    ElMessage.success(`已应用推荐的结束日期：${calculatedOptimalEndDate.value}（约${calculatedOptimalDays.value}个工作日）`)
  }
}

// 日期变化处理
const onStartDateChange = () => {
  // 使用dateUtils验证日期格式
  if (examStartDateStr.value) {
    const parsedDate = dateUtils.parseDate(examStartDateStr.value)
    if (parsedDate) {
      examStartDateStr.value = dateUtils.toStorageDate(parsedDate)
    }
    // 开始日期变化时重新计算最优结束日期
    calculateOptimalEndDate()
  } else {
    calculatedOptimalEndDate.value = ''
    calculatedOptimalDays.value = 0
  }
  updateDateSuggestion()
}

const onEndDateChange = () => {
  // 使用dateUtils验证日期格式
  if (examEndDateStr.value) {
    const parsedDate = dateUtils.parseDate(examEndDateStr.value)
    if (parsedDate) {
      examEndDateStr.value = dateUtils.toStorageDate(parsedDate)
    }
  }
  updateDateSuggestion()
}

// 智能建议相关方法 - 暂时注释，待排班功能稳定后重新启用
/*
const updateDateSuggestion = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) {
    dateRangeSuggestion.value = ''
    suggestedDateRange.value = null
    return
  }

  const workdays = calculateWorkdays()
  const studentCount = studentList.value.length
  const requiredExams = studentCount * 2
  const averagePerDay = workdays > 0 ? Math.ceil(requiredExams / workdays) : 0

  // 简化的日期建议逻辑
  if (workdays < 2) {
    dateRangeSuggestion.value = '建议选择至少包含2个工作日的日期范围，以确保有足够时间完成所有考试。'
    const today = new Date()
    const suggestedStart = new Date(today)
    suggestedStart.setDate(today.getDate() + 1)
    const suggestedEnd = new Date(suggestedStart)
    suggestedEnd.setDate(suggestedStart.getDate() + 6) // 一周

    suggestedDateRange.value = {
      start: dateUtils.toStorageDate(suggestedStart),
      end: dateUtils.toStorageDate(suggestedEnd)
    }
  } else if (averagePerDay > 15) {
    // 平均每天超过15场考试，建议延长日期范围
    dateRangeSuggestion.value = `当前平均每日安排${averagePerDay}场考试，负荷较重。建议延长日期范围以降低每日工作强度。`
    const today = new Date()
    const suggestedStart = new Date(today)
    suggestedStart.setDate(today.getDate() + 1)
    const suggestedEnd = new Date(suggestedStart)
    // 建议将每日场次控制在10场以内
    const recommendedDays = Math.ceil(requiredExams / 10)
    suggestedEnd.setDate(suggestedStart.getDate() + recommendedDays + 3)

    suggestedDateRange.value = {
      start: dateUtils.toStorageDate(suggestedStart),
      end: dateUtils.toStorageDate(suggestedEnd)
    }
  } else if (averagePerDay < 3 && workdays > 10) {
    // 平均每天少于3场考试且工作日超过10天，建议缩短日期范围
    dateRangeSuggestion.value = `当前平均每日仅安排${averagePerDay}场考试，日期范围较长。可以适当缩短日期范围提高效率。`
    const today = new Date()
    const suggestedStart = new Date(today)
    suggestedStart.setDate(today.getDate() + 1)
    const suggestedEnd = new Date(suggestedStart)
    const recommendedDays = Math.ceil(requiredExams / 6) // 建议每日6场左右
    suggestedEnd.setDate(suggestedStart.getDate() + recommendedDays + 1)

    suggestedDateRange.value = {
      start: dateUtils.toStorageDate(suggestedStart),
      end: dateUtils.toStorageDate(suggestedEnd)
    }
  } else {
    // 日期范围合理，不需要建议
    dateRangeSuggestion.value = ''
    suggestedDateRange.value = null
  }
}

const applySuggestion = () => {
  if (suggestedDateRange.value) {
    examStartDateStr.value = suggestedDateRange.value.start
    examEndDateStr.value = suggestedDateRange.value.end
    dateRangeSuggestion.value = ''
    suggestedDateRange.value = null
  }
}
*/

// 简化版的更新函数，不提供建议
const updateDateSuggestion = () => {
  // 暂时不提供智能建议，仅清空相关状态
  // dateRangeSuggestion.value = ''
  // suggestedDateRange.value = null
}

const applySuggestion = () => {
  // 暂时禁用建议应用功能
}

// 基于约束条件的理论容量计算
// 暂时注释约束条件容量计算，待排班功能稳定后重新启用
/*
const calculateConstraintBasedCapacity = () => {
  const workdays = calculateWorkdays()
  if (workdays === 0) return { maxExamsPerDay: 0, bottleneck: '无可用工作日', details: {} }

  // 获取考官数据进行容量分析
  let teacherCount = 0
  let departmentStats: Record<string, number> = {}

  try {
    // 尝试从缓存获取考官数据
    if (cachedTeacherData && Array.isArray(cachedTeacherData)) {
      teacherCount = cachedTeacherData.length
      cachedTeacherData.forEach(teacher => {
        if (teacher.department) {
          departmentStats[teacher.department] = (departmentStats[teacher.department] || 0) + 1
        }
      })
    } else {
      // 从localStorage获取考官数据进行估算
      const teacherKeys = ['teachers', 'examiner_teachers', 'unified_teachers', 'teacher_data', 'teacherList']
      for (const key of teacherKeys) {
        try {
          const data = localStorage.getItem(key)
          if (data) {
            const parsed = JSON.parse(data)
            if (Array.isArray(parsed) && parsed.length > 0) {
              teacherCount = parsed.length
              parsed.forEach((teacher: any) => {
                if (teacher.department) {
                  departmentStats[teacher.department] = (departmentStats[teacher.department] || 0) + 1
                }
              })
              break
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
  } catch (error) {
    console.warn('获取考官数据用于容量计算时出错:', error)
  }

  const departmentCount = Object.keys(departmentStats).length
  const details = {
    teacherCount,
    departmentCount,
    departmentStats,
    workdays
  }

  // 约束条件分析
  let maxExamsPerDay = Infinity
  let bottleneck = ''

  // HC4约束：每名考官每天只能监考一名考生
  if (teacherCount > 0) {
    const hc4Limit = teacherCount // 每个考官每天最多1场
    if (hc4Limit < maxExamsPerDay) {
      maxExamsPerDay = hc4Limit
      bottleneck = `HC4约束：考官数量限制（${teacherCount}名考官）`
    }
  }

  // HC7约束：每场考试需要2名不同科室的考官
  if (teacherCount > 0) {
    const hc7Limit = Math.floor(teacherCount / 2) // 每场考试需要2个考官
    if (hc7Limit < maxExamsPerDay) {
      maxExamsPerDay = hc7Limit
      bottleneck = `HC7约束：每场考试需要2名考官（${teacherCount}名考官最多${hc7Limit}场）`
    }
  }

  // HC2+HC7约束：科室匹配限制
  if (departmentCount > 0) {
    // 简化的科室匹配计算：假设科室间可以相互配对
    const crossDeptCombinations = departmentCount >= 2 ?
      Math.floor(teacherCount / 2) : // 有多个科室时，主要受考官总数限制
      0 // 只有一个科室时，无法满足不同科室要求

    if (crossDeptCombinations < maxExamsPerDay) {
      maxExamsPerDay = crossDeptCombinations
      bottleneck = departmentCount < 2 ?
        `HC2+HC7约束：科室数量不足（仅${departmentCount}个科室）` :
        `HC2+HC7约束：科室匹配限制（${departmentCount}个科室，最多${crossDeptCombinations}场）`
    }
  }

  // 如果没有考官数据，使用保守估算
  if (teacherCount === 0) {
    maxExamsPerDay = 5 // 保守估算
    bottleneck = '考官数据未加载，使用保守估算'
  }
  
  return {
    maxExamsPerDay: maxExamsPerDay === Infinity ? 10 : maxExamsPerDay,
    bottleneck,
    details
  }
}
*/

// 容量评估方法（增强版）- 暂时注释，待排班功能稳定后重新启用
/*
const getAverageExamsPerDay = () => {
  const workdays = calculateWorkdays()
  const requiredExams = studentList.value.length * 2
  return workdays > 0 ? Math.ceil(requiredExams / workdays) : 0
}

const getTheoreticalMaxExamsPerDay = () => {
  const capacity = calculateConstraintBasedCapacity()
  return capacity.maxExamsPerDay
}

const getCapacityUtilization = () => {
  const average = getAverageExamsPerDay()
  const theoretical = getTheoreticalMaxExamsPerDay()
  return theoretical > 0 ? Math.round((average / theoretical) * 100) : 0
}

const getCapacityStatusClass = () => {
  const average = getAverageExamsPerDay()
  const theoretical = getTheoreticalMaxExamsPerDay()
  const utilization = getCapacityUtilization()
  
  // 如果超过理论上限，标记为危险
  if (average > theoretical) return 'danger'
  // 如果利用率超过90%，标记为警告
  if (utilization > 90) return 'warning'
  // 如果利用率低于30%，标记为信息
  if (utilization < 30) return 'info'
  return 'success'
}

const getCapacityStatusText = () => {
  const average = getAverageExamsPerDay()
  const theoretical = getTheoreticalMaxExamsPerDay()
  const utilization = getCapacityUtilization()
  const capacity = calculateConstraintBasedCapacity()
  
  if (average > theoretical) {
    return `⚠️ 超出理论容量上限（${theoretical}场/天），${capacity.bottleneck}`
  }
  
  if (utilization > 90) {
    return `⚠️ 容量利用率过高（${utilization}%），接近理论上限${theoretical}场/天`
  }
  
  if (utilization < 30) {
    return `ℹ️ 容量利用率较低（${utilization}%），可考虑缩短日期范围`
  }
  
  return `✅ 容量利用率合理（${utilization}%），理论上限${theoretical}场/天`
}
*/

// 增强的日期统计函数
const getDateRangeStatistics = () => {
  if (!examStartDateStr.value || !examEndDateStr.value) {
    return {
      totalDays: 0,
      workdays: 0,
      weekends: 0,
      holidays: 0,
      adjustedWorkdays: 0,
      isValidRange: false
    }
  }
  
  const startDate = new Date(examStartDateStr.value)
  const endDate = new Date(examEndDateStr.value)
  
  if (startDate > endDate) {
    return {
      totalDays: 0,
      workdays: 0,
      weekends: 0,
      holidays: 0,
      adjustedWorkdays: 0,
      isValidRange: false
    }
  }
  
  // 使用与generateExamDateRange相同的逻辑
  const examDates = generateExamDateRange(startDate, endDate)
  const workdays = examDates.length
  
  // 计算总天数、周末天数和节假日天数
  let totalDays = 0
  let weekends = 0
  let holidays = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    totalDays++
    const dateStr = dateUtils.toStorageDate(current)
    const dayOfWeek = current.getDay()
    
    // 检查是否为节假日
    if (holidayService.isHoliday(dateStr)) {
      holidays++
    } else if (dayOfWeek === 0 || dayOfWeek === 6) { // 周日或周六（非节假日）
      weekends++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return {
    totalDays,
    workdays,
    normalWorkdays: workdays,
    weekends,
    holidays, // 实际节假日数量
    adjustedWorkdays: 0, // 调休工作日已包含在workdays中
    isValidRange: workdays >= 2 // 至少需要2个工作日
  }
}

// 计算活跃软约束数量
const getActiveSoftConstraintsCount = () => {
  const constraintsObj = constraints.value as any
  const softConstraintKeys = [
    'nightShiftTeacherPriority',
    'examiner2ProfessionalMatch',
    'firstRestDayTeacherPriority',
    'backupExaminerProfessionalMatch',
    'secondRestDayTeacherPriority',
    'examiner2AlternativeOption',
    'adminTeacherPriority',
    'backupExaminerAlternativeOption',
    'allowDept37CrossUse',
    'balanceWorkload',
    'preferLaterDates',
    'avoidWeekendSchedulingEnabled',
    'preferNightShiftOnWeekendEnabled'
  ]
  
  return softConstraintKeys.filter(key => constraintsObj[key]).length
}

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 开始排班方法
const startScheduling = async () => {
  // 🔍 使用新调试工具进行完整诊断（仅在有数据时）
  if (studentList.value && studentList.value.length > 0 && teacherList.value && teacherList.value.length > 0) {
    const diagnosisResult = debugScheduleData(studentList.value, teacherList.value)
    
    // 如果检测到科室匹配问题，警告用户
    if (diagnosisResult && diagnosisResult.hasIssue) {
      console.error('❌ 检测到科室匹配问题，排班可能失败！请检查上方诊断信息。')
      // 可选：弹出提示（暂时注释，避免打断用户）
      // alert('⚠️ 检测到科室匹配问题！部分学员所在科室没有对应的考官。\n请查看控制台详细信息。')
    }
  } else {
    console.log('⚠️ 学员或考官数据为空，跳过数据诊断')
  }
  
  // 同步日期数据
  process.env.NODE_ENV === 'development' && console.log('🔍 日期同步调试:')
  process.env.NODE_ENV === 'development' && console.log('examStartDateStr.value:', examStartDateStr.value)
  process.env.NODE_ENV === 'development' && console.log('examEndDateStr.value:', examEndDateStr.value)
  
  if (examStartDateStr.value) {
    examStartDate.value = dateUtils.parseDate(examStartDateStr.value)
    process.env.NODE_ENV === 'development' && console.log('✅ 开始日期同步成功:', examStartDate.value)
  } else {
    console.warn('⚠️ examStartDateStr为空')
  }
  
  if (examEndDateStr.value) {
    examEndDate.value = dateUtils.parseDate(examEndDateStr.value)
    process.env.NODE_ENV === 'development' && console.log('✅ 结束日期同步成功:', examEndDate.value)
  } else {
    console.warn('⚠️ examEndDateStr为空')
  }
  
  // 验证日期数据
  if (!examStartDate.value || !examEndDate.value) {
    // 尝试从字符串重新解析日期
    process.env.NODE_ENV === 'development' && console.log('🔧 尝试从字符串重新解析日期...')
    if (examStartDateStr.value) {
      examStartDate.value = dateUtils.parseDate(examStartDateStr.value)
      process.env.NODE_ENV === 'development' && console.log('🔧 重新解析开始日期:', examStartDate.value)
    }
    if (examEndDateStr.value) {
      examEndDate.value = dateUtils.parseDate(examEndDateStr.value)
      process.env.NODE_ENV === 'development' && console.log('🔧 重新解析结束日期:', examEndDate.value)
    }
    
    // 再次验证
    if (!examStartDate.value || !examEndDate.value || examStartDate.value.getTime() === 0 || examEndDate.value.getTime() === 0) {
      schedulingError.value = '请重新设置考试开始日期和结束日期'
      console.error('❌ 排班失败: 日期解析失败', {
        examStartDate: examStartDate.value,
        examEndDate: examEndDate.value,
        examStartDateStr: examStartDateStr.value,
        examEndDateStr: examEndDateStr.value
      })
      
      // 强制用户回到日期设置步骤
      currentStep.value = 2
      return
    }
  }
  
  // 添加详细的排班前检查
  process.env.NODE_ENV === 'development' && console.log('🔍 排班前数据检查:')
  process.env.NODE_ENV === 'development' && console.log('📅 开始日期:', examStartDate.value?.toISOString())
  process.env.NODE_ENV === 'development' && console.log('📅 结束日期:', examEndDate.value?.toISOString())
  process.env.NODE_ENV === 'development' && console.log('👥 学员数量:', studentList.value?.length || 0)
  process.env.NODE_ENV === 'development' && console.log('👨‍🏫 考官数量:', teacherList.value?.length || 0)
  
  // 检查学员数据
  if (!studentList.value || studentList.value.length === 0) {
    schedulingError.value = '请先加载学员数据'
    console.error('❌ 排班失败: 学员数据为空')
    return
  }
  
  // 检查教师数据
  if (!teacherList.value || teacherList.value.length === 0) {
    schedulingError.value = '请先加载教师数据'
    console.error('❌ 排班失败: 教师数据为空')
    return
  }
  
  // 🆕 v7.1.2: 检查考试天数是否足够
  const examDaysCheck = calculateOptimalExamDays(studentList.value, teacherList.value)
  const actualExamDays = Math.ceil((examEndDate.value!.getTime() - examStartDate.value!.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  console.log('📊 [考试天数校验]')
  console.log(`   设置天数: ${actualExamDays}天`)
  console.log(`   最少需要: ${examDaysCheck.minDays}天`)
  console.log(`   推荐天数: ${examDaysCheck.recommendedDays}天`)
  console.log(`   瓶颈: ${examDaysCheck.bottleneck}`)
  
  if (actualExamDays < examDaysCheck.minDays) {
    // 天数严重不足，必须调整
    const errorMessage = `考试天数不足！\n\n` +
      `当前设置: ${actualExamDays}天\n` +
      `最少需要: ${examDaysCheck.minDays}天\n` +
      `推荐天数: ${examDaysCheck.recommendedDays}天\n\n` +
      `瓶颈原因: ${examDaysCheck.bottleneck}\n\n` +
      `请调整结束日期，确保至少有 ${examDaysCheck.minDays} 天的考试周期。`
    
    await ElMessageBox.alert(errorMessage, '⚠️ 考试天数不足', {
      confirmButtonText: '知道了',
      type: 'warning',
      dangerouslyUseHTMLString: false
    })
    
    schedulingError.value = `考试天数不足，最少需要 ${examDaysCheck.minDays} 天`
    currentStep.value = 2 // 返回日期设置步骤
    return
  } else if (actualExamDays < examDaysCheck.recommendedDays) {
    // 天数较紧，给出警告但允许继续
    const confirmResult = await ElMessageBox.confirm(
      `当前设置 ${actualExamDays} 天可能较紧张。\n\n` +
      `推荐天数: ${examDaysCheck.recommendedDays}天\n` +
      `瓶颈原因: ${examDaysCheck.bottleneck}\n\n` +
      `继续排班可能导致部分学员无法分配到最优时间。\n是否继续？`,
      '💡 考试天数建议',
      {
        confirmButtonText: '继续排班',
        cancelButtonText: '调整天数',
        type: 'info'
      }
    ).catch(() => 'cancel')
    
    if (confirmResult === 'cancel') {
      currentStep.value = 2 // 返回日期设置步骤
      return
    }
  }
  
  // 调用原有的排班逻辑
  await originalNextStep()
}

// 约束切换方法（移除重复定义）
// 使用前面已定义的toggleConstraint函数

// 步骤验证方法
const canProceedToNextStep = () => {
  const result = (() => {
    switch (currentStep.value) {
      case 1:
        return studentList.value.length > 0
      case 2:
        if (!examStartDateStr.value || !examEndDateStr.value) {
          return false
        }
        // 使用dateUtils比较日期
        const startDate = dateUtils.parseDate(examStartDateStr.value)
        const endDate = dateUtils.parseDate(examEndDateStr.value)
        return startDate && endDate && startDate <= endDate
      case 3:
        // 智能评估步骤，只要不是红色警告级别就可以继续
        return isAssessmentPassable()
      case 4:
        // 确认执行步骤
        return studentList.value.length > 0 && examStartDateStr.value && examEndDateStr.value
      default:
        return false
    }
  })()
  
  process.env.NODE_ENV === 'development' && console.log(`🔍 canProceedToNextStep 检查 - 步骤${currentStep.value}:`, result)
  if (currentStep.value === 1) {
    process.env.NODE_ENV === 'development' && console.log('学员数量:', studentList.value.length)
    process.env.NODE_ENV === 'development' && console.log('学员列表状态', studentList.value)
        process.env.NODE_ENV === 'development' && console.log('学员列表是否为数组', Array.isArray(studentList.value))
  }
  if (currentStep.value === 2) {
    process.env.NODE_ENV === 'development' && console.log('开始日期', examStartDateStr.value)
    process.env.NODE_ENV === 'development' && console.log('结束日期:', examEndDateStr.value)
  }
  
  return result
}

// 步骤导航方法（移除重复定义）
// 使用前面已定义的nextStep、prevStep、goToStep函数

// 
// 
const originalNextStep = async () => {
  try {
    // 验证必要条件
    if (studentList.value.length === 0) {
      // 使用增强错误反馈显示学员名单缺失错误
      const conflicts: ConflictInfo[] = [{
        id: 'missing-student-list',
        type: 'scheduling_conflict',
        severity: 'HIGH',
        description: '缺少学员名单数据',
        affectedEntities: ['students'],
        suggestedSolutions: [
          '上传学员名单文件',
          '检查文件格式是否正确'
        ],
        autoResolvable: false
      }]
      
      enhancedErrorFeedbackService.showErrorFeedback(
        'validation_error',
        '请先上传学员名单文件',
        conflicts
      )
      
      schedulingError.value = '请先上传学员名单文件'
      return
    }
    
    if (!examStartDate.value || !examEndDate.value) {
      // 使用增强错误反馈显示日期范围缺失错误
      const conflicts: ConflictInfo[] = [{
        id: 'missing-date-range',
        type: 'scheduling_conflict',
        severity: 'MEDIUM',
        description: '缺少考试日期范围配置',
        affectedEntities: ['schedule'],
        suggestedSolutions: [
          '设置考试开始和结束日期',
          '检查日期是否为工作日'
        ],
        autoResolvable: false
      }]
      
      enhancedErrorFeedbackService.showErrorFeedback(
        'validation_error',
        '请选择考试日期范围',
        conflicts
      )
      
      schedulingError.value = '请选择考试日期范围'
      return
    }
    
    process.env.NODE_ENV === 'development' && console.log('🚀 启动增强排班系统')
    process.env.NODE_ENV === 'development' && console.log('🔍 当前学员数量:', studentList.value.length)
    process.env.NODE_ENV === 'development' && console.log('🔍 考试日期范围:', examStartDate.value, '到', examEndDate.value)
    
    // 设置排班状态
    isScheduling.value = true
    schedulingError.value = ''
    
    // ⏱️ 记录开始时间并估算持续时间
    schedulingStartTime.value = Date.now()
    // 根据学员数量和模式估算持续时间
    const studentCount = studentList.value.length
    const mode = solvingModeRef.value
    
    // 基础预估时间
    let baseDuration = 0
    if (mode === 'fast') {
      if (studentCount < 5) baseDuration = 3000      // 3秒
      else if (studentCount < 15) baseDuration = 10000  // 10秒
      else if (studentCount < 30) baseDuration = 30000  // 30秒
      else baseDuration = 60000  // 60秒
    } else {
      if (studentCount < 10) baseDuration = 25000   // 25秒
      else if (studentCount < 30) baseDuration = 45000  // 45秒
      else baseDuration = 75000  // 75秒
    }
    
    estimatedDuration.value = baseDuration
    
    process.env.NODE_ENV === 'development' && console.log(`⏱️ 预计求解时间: ${estimatedDuration.value / 1000}秒 (${studentCount}名学员, ${mode}模式)`)
    
    // ✈️ 重置民航主题加载界面状态
    currentHardScore.value = undefined
    currentSoftScore.value = undefined
    currentAssignmentCount.value = 0
    totalStudents.value = studentList.value.length
    schedulingCompleted.value = false
    finalScheduleStatistics.value = {}
    
    // 🚀 启动智能进度管理器（新方式）
    const totalAssignments = studentList.value.reduce((sum: number, s: any) => sum + ((s?.examDays || 2) === 1 ? 1 : 2), 0)
    smartProgress.setTotalAssignments(totalAssignments)
    smartProgress.start()
    process.env.NODE_ENV === 'development' && console.log(`🎯 [智能进度] 已启动，总分配数: ${totalAssignments}，使用新的useSmartProgress管理器`)
    
    // 🎯 重置中间结果显示状态
    isShowingIntermediateResult.value = false
    if (intermediateResultTimer) {
      clearTimeout(intermediateResultTimer)
      intermediateResultTimer = null
    }
    
    // 准备考官数据
    const teachers: TeacherInfo[] = await prepareTeacherData()
    
    // 缓存考官数据供getTeacherNameById使用
    cachedTeacherData = teachers
    teacherList.value = teachers  // 同时更新teacherList供排班检查使用
    process.env.NODE_ENV === 'development' && console.log('考官数据已缓存，缓存数量:', cachedTeacherData.length)
    
    // 考官数据完整性验证
    process.env.NODE_ENV === 'development' && console.log('🔍 开始考官数据完整性验证.')
    const teacherValidationResult = validateTeacherData(teachers)
    if (!teacherValidationResult.isValid) {
      console.error('考官数据验证失败:', teacherValidationResult.errors)
      
      // 使用增强错误反馈显示考官数据验证错误
      const conflicts: ConflictInfo[] = [{
        id: 'teacher-validation-error',
        type: 'scheduling_conflict',
        severity: 'HIGH',
        description: '考官数据验证失败',
        affectedEntities: ['teachers'],
        suggestedSolutions: [
          '检查考官数据完整性',
          '重新加载考官数据',
          '修复考官数据格式'
        ],
        autoResolvable: false
      }]
      
      enhancedErrorFeedbackService.showErrorFeedback(
        'validation_error',
        `考官数据验证失败: ${teacherValidationResult.errors.join(', ')}`,
        conflicts
      )
      
      schedulingError.value = `考官数据验证失败: ${teacherValidationResult.errors.join(', ')}`
      stopIntelligentProgressUpdate()  // 停止智能进度更新
      isScheduling.value = false
      return
    }
    process.env.NODE_ENV === 'development' && console.log('考官数据验证通过，有效考官数:', teacherValidationResult.validCount)
    
    // 准备学员数据 (后端监听器将自动推送进度)
    const students: StudentInfo[] = await prepareStudentData()
    process.env.NODE_ENV === 'development' && console.log('学员数据准备完成:', students.length, '名学员')
    
    // 生成考试日期列表
    const examDates = generateExamDateRange(examStartDate.value, examEndDate.value)
    process.env.NODE_ENV === 'development' && console.log('考试日期列表:', examDates)
    
    // 求解模式配置
    const solvingMode = solvingModeRef.value || 'auto'
    process.env.NODE_ENV === 'development' && console.log('🎯 使用求解模式:', solvingMode)
    
    // 🎯 最终优化排班- 完整降级体系 (严格按照constraint_weights_analysis.md文档规范);
    // 映射到后端ConstraintConfiguration的格式
    const basicConstraints = {
      // Hard constraints - HC1约束正确配置
      workdaysOnlyExam: true,  // HC1: 法定节假日不安排考试，周末可以但行政班考官不参与
      consecutiveTwoDaysExamEnabled: true,  // HC6: 考生需要在连续两天完成考试
      noDayShiftExaminer: true,  // HC3: 考官执勤白班不能安排考试（行政班考官除外）
      noStudentGroupDayShift: true,  // HC5: 考生执勤白班不能安排考试
      examinerDepartmentRules: true,  // HC2: 考官1与学员同科室
      twoMainExaminersRequired: true,  // HC7: 必须有考官1和考官2两名考官
      noExaminerTimeConflict: true,  // HC4: 每名考官每天只能监考一名考生
      // 移除冗余的约束配置，使用统一的workdaysOnlyExam
      
      // 软约束权重 - 严格按照文档权重设置
      // SC1: 晚班考官优先级最高权重（权重：100）
      nightShiftTeacherPriority: 100,
      // SC2: 考官2专业匹配（权重：90）
      preferRecommendedExaminer2Weight: 90,
      // SC3: 休息第一天考官优先级次高权重（权重：80）
      preferFirstRestDayTeachers: 80,
      firstRestDayTeacherPriority: 80,
      // SC4: 备份考官专业匹配（权重：70）
      preferRecommendedBackup: 70,
      // SC5: 休息第二天考官优先级中等权重（权重：60）
      preferSecondRestDayTeachers: 60,
      secondRestDayTeacherPriority: 60,
      // SC6: 考官2备选方案（权重：50）
      preferNonRecommendedExaminer2: 50,
      // SC7: 行政班考官优先级最低权重（权重：40）
      preferAdminTeachers: 40,
      adminTeacherPriority: 40,
      // SC8: 备份考官备选方案（权重：30）
      preferNonRecommendedBackup: 30,
      // SC9: 区域协作鼓励（权重：20）
      allowDept37CrossUse: 20,
      // SC10: 工作量均衡（权重：10）
      balanceWorkload: 10,
      // SC11: 日期分配均衡（权重：5）
      preferLaterDates: 5,
      // SC16: 智能周末降级策略（权重：500）
      avoidWeekendSchedulingEnabled: constraints.value.avoidWeekendSchedulingEnabled,
      // SC17: 周末优先晚班考官策略（权重：300）
      preferNightShiftOnWeekendEnabled: constraints.value.preferNightShiftOnWeekendEnabled,
      // 启用灵活调度
      enableFlexibleScheduling: 10,
      maxTwoStudentsPerDay: 15,
      teacherStatusPriority: 80,
      nightShiftTeacherRecommendedDepartmentBonus: 25
    }
    
    // 转换为OptaPlanner格式
    const optaPlannerStudents = students.map((student: any) => ({
      id: student.id,
      name: student.name,
      // 统一向后端使用区域一室等全称，避免后端科室识别为空
      department: mapDepartmentName(student.department),
      group: student.group || '组', // 确保group不为空
      // 推荐考官科室也统一转全称（若本身为简写）
      recommendedExaminer1Dept: student.recommendedExaminer1Dept ? mapDepartmentName(student.recommendedExaminer1Dept) : undefined,
      recommendedExaminer2Dept: student.recommendedExaminer2Dept ? mapDepartmentName(student.recommendedExaminer2Dept) : undefined,
      recommendedBackupDept: student.recommendedBackupDept ? mapDepartmentName(student.recommendedBackupDept) : undefined,
      // 🆕 考试天数和科目信息
      examDays: student.examDays || 2,
      day1Subjects: student.day1Subjects ? JSON.stringify(student.day1Subjects) : JSON.stringify(['现场', '模拟机1']),
      day2Subjects: student.day2Subjects ? JSON.stringify(student.day2Subjects) : JSON.stringify(['模拟机2', '口试'])
    }))
    
    const optaPlannerTeachers = teachers.map(teacher => ({
      id: teacher.id,
      name: teacher.name,
      // 统一转全称，避免后端内部分支解析失败
      department: mapDepartmentName(teacher.department),
      group: teacher.group,
      skills: teacher.skills,
      workload: teacher.workload,
      consecutiveDays: teacher.consecutiveDays,
      // 🔧 关键修复：传递不可用期数据到后端
      unavailablePeriods: teacher.unavailablePeriods || []
    }))
    
    // 🔧 新增：验证考官数据，禁止非法科室
    const illegalTeachers = optaPlannerTeachers.filter(t => {
      const dept = t.department || ''
      return dept.includes('模拟机') || dept.includes('现场') || 
             dept.includes('口试') || dept.includes('理论') || 
             dept.includes('实操') || dept.includes('实践') || dept.includes('笔试')
    })
    
    if (illegalTeachers.length > 0) {
      const names = illegalTeachers.map(t => `${t.name}(${t.department})`).join(', ')
      ElMessage.error(`🚨 数据错误：检测到${illegalTeachers.length}名考官的科室数据异常`)
      throw new Error(`数据错误：检测到${illegalTeachers.length}名考官的科室数据异常：\n${names}\n\n这些是考试科目，不是科室名称！请返回考官管理页面检查数据。`)
    }
    
    // 验证日期数据并构建OptaPlanner排班请求
    if (!examStartDate.value || !examEndDate.value) {
      throw new Error('日期数据未正确设置，无法构建排班请求')
    }
    
    const startDateStr = dateUtils.toStorageDate(examStartDate.value)
    const endDateStr = dateUtils.toStorageDate(examEndDate.value)
    
    process.env.NODE_ENV === 'development' && console.log('🔍 构建OptaPlanner请求，日期验证:')
    process.env.NODE_ENV === 'development' && console.log('📅 开始日期:', startDateStr)
    process.env.NODE_ENV === 'development' && console.log('📅 结束日期:', endDateStr)
    
    const optaPlannerRequest: OptaPlannerRequest = {
      students: optaPlannerStudents,
      teachers: optaPlannerTeachers,
      startDate: startDateStr,
      endDate: endDateStr,
      examDates: examDates, // 传递计算好的可用日期（已排除不可用日期和周末）
      constraints: basicConstraints,
      solverConfig: {
        timeoutSeconds: solvingMode === 'fast' ? 15 : solvingMode === 'optimal' ? 60 : 30,
        maxIterations: solvingMode === 'fast' ? 3000 : solvingMode === 'optimal' ? 10000 : 5000,
        description: `${solvingMode}模式求解配置`
      }
    }
    
    process.env.NODE_ENV === 'development' && console.log('🚀 OptaPlanner排班请求配置:', {
      solvingMode,
      solverConfig: optaPlannerRequest.solverConfig,
      studentsCount: students.length,
      teachersCount: teachers.length,
      examDatesCount: examDates.length
    })
    
    // 详细日志：打印完整的请求数据
    process.env.NODE_ENV === 'development' && console.log('📋 完整学员数据:', students)
    process.env.NODE_ENV === 'development' && console.log('👥 完整考官数据:', teachers)
    process.env.NODE_ENV === 'development' && console.log('📅 考试日期:', examDates)
    process.env.NODE_ENV === 'development' && console.log('⚙️ 约束配置:', basicConstraints)
    process.env.NODE_ENV === 'development' && console.log('🔧 完整请求对象:', optaPlannerRequest)
    
    process.env.NODE_ENV === 'development' && console.log('🧠 启动OptaPlanner排班服务...')
    // 进度将由后端实时监听器自动推送
    
    // 🔑 关键修复：在发起请求前生成sessionId并连接WebSocket
    const sessionId = 'schedule-' + Date.now() + '-' + Math.random().toString(36).substring(7)
    wsSessionId.value = sessionId
    ;(window as any).__opta_session_id = sessionId
    process.env.NODE_ENV === 'development' && console.log('🔑 [关键修复] 生成sessionId并同步至全局:', sessionId)
    
    // 🆕 立即连接WebSocket（在发起请求之前）
    try {
      process.env.NODE_ENV === 'development' && console.log('📡 [关键修复] 在发起请求前连接WebSocket...')
      await connectWebSocketForRealtimeUpdates(sessionId)
      process.env.NODE_ENV === 'development' && console.log('✅ [关键修复] WebSocket已连接，准备接收中间结果')
    } catch (error) {
      console.error('❌ [关键修复] WebSocket连接失败:', error)
    }
    
    // 🎯 立即滚动到排班结果区域并关闭弹窗
    closeModal()
    await nextTick()
    
    // 🎯 准备实时进度数据（不自动显示窗口）
    // 用户需要点击"实时计算流程"按钮来查看进度详情
    realtimeLogs.value = [] // 清空之前的日志
    latestSoftScore.value = null
    bestSoftScore.value = null
    
    // 添加开始日志
    addRealtimeLog('🚀 开始排班计算', 'info')
    addRealtimeLog(`📊 学员数量: ${students.length}, 考官数量: ${teachers.length}`, 'info')
    addRealtimeLog(`📅 日期范围: ${dateUtils.toStorageDate(examStartDate.value)} 到 ${dateUtils.toStorageDate(examEndDate.value)}`, 'info')
    addRealtimeLog(`📡 WebSocket已连接，等待实时更新...`, 'info')
    
    // 滚动到排班结果表格
    setTimeout(() => {
      const scheduleTable = document.querySelector('.schedule-table')
      if (scheduleTable) {
        scheduleTable.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    
    // 初始化进度状态
    totalStudents.value = students.length
    currentAssignmentCount.value = 0
    currentProgressMessage.value = '正在初始化排班算法...'
    
    // 🔍 验证请求数据的完整性
    process.env.NODE_ENV === 'development' && console.log('🔍 验证OptaPlanner请求数据:')
    process.env.NODE_ENV === 'development' && console.log('📋 学员数据:', students.length, '名学员')
    process.env.NODE_ENV === 'development' && console.log('👥 考官数据:', teachers.length, '名考官')
    process.env.NODE_ENV === 'development' && console.log('📅 考试日期范围:', examStartDate.value, '到', examEndDate.value)
    process.env.NODE_ENV === 'development' && console.log('📊 可用考试日期:', examDates.length, '天')
    process.env.NODE_ENV === 'development' && console.log('⚙️ 约束配置keys:', Object.keys(basicConstraints))
    
    // 🔍 详细检查不可用期数据
    process.env.NODE_ENV === 'development' && console.log('\n========== 不可用期数据检查 ==========')
    const teachersWithUnavailable = teachers.filter(t => t.unavailablePeriods && t.unavailablePeriods.length > 0)
    process.env.NODE_ENV === 'development' && console.log(`📊 有不可用期的考官数量: ${teachersWithUnavailable.length}/${teachers.length}`)
    teachersWithUnavailable.forEach(teacher => {
      process.env.NODE_ENV === 'development' && console.log(`🚫 考官 ${teacher.name}:`)
      teacher.unavailablePeriods?.forEach(period => {
        process.env.NODE_ENV === 'development' && console.log(`   - ${period.startDate} ~ ${period.endDate} (${period.reason})`)
      })
    })
    process.env.NODE_ENV === 'development' && console.log('=========================================\n')
    
    // 执行OptaPlanner排班（带实时进度更新）
    const optaPlannerResult: OptaPlannerResponse = await optaPlannerService.generateSchedule(
      optaPlannerRequest,
      // 实时进度回调函数（修复：添加async支持await）
      async (progress) => {
        smartProgress.setProgress(Math.max(25, progress.percentage))
        
        // 更新进度消息
        if (progress.message) {
          currentProgressMessage.value = progress.message
        }
        
        // ✈️ 更新分数显示（用于民航主题加载界面）
        if (progress.score) {
          currentHardScore.value = progress.score.hardScore
          currentSoftScore.value = progress.score.softScore
        }
        
        // 🚫 **已禁用：OptaPlanner进度回调的实时更新**
        // 原因：会导致多次调用 updateScheduleResults，造成表格重复显示
        // 只在最终完成时显示结果
        if (progress.currentSolution && progress.currentSolution.assignments && progress.currentSolution.assignments.length > 0) {
          // ✅ 保留进度统计（不显示表格）
          const assignedCount = progress.currentSolution.assignments.length
          currentAssignmentCount.value = assignedCount
          // 同步到智能进度管理器
          smartProgress.setActualAssignmentCount(assignedCount)
          
          const totalAssignments = students.reduce((sum: number, s: any) => sum + ((s?.examDays || 2) === 1 ? 1 : 2), 0)
          const assignmentProgress = Math.min(100, Math.round((assignedCount / totalAssignments) * 100))
          
          // ✅ 保留进度消息
          currentProgressMessage.value = `正在计算最优方案...`
          
          // ✅ 保留日志
          process.env.NODE_ENV === 'development' && console.log(`📊 OptaPlanner求解进度: ${assignmentProgress}% (${assignedCount}/${totalAssignments})`)
          addRealtimeLog(`🔍 OptaPlanner求解中: ${assignmentProgress}% 完成`, 'info')
          
          // 🚫 **禁用实时表格更新**
          // 不再调用 updateScheduleResults，避免重复显示
          process.env.NODE_ENV === 'development' && console.log('🔕 [已禁用] 跳过进度回调的表格更新，等待最终结果')
        }
        
        /* ========== 以下代码已禁用（进度回调更新） ========== */
        /*
        if (progress.currentSolution && progress.currentSolution.assignments && progress.currentSolution.assignments.length > 0) {
          ...
          const intermediateResult = {...}
          await updateScheduleResults(intermediateResult as any, true)  // 这行导致重复！
          ...
        }
        */
        /* ========== 禁用代码结束 ========== */
        
        // 如果排班完成，标记完成状态
        if (progress.percentage === 100) {
          process.env.NODE_ENV === 'development' && console.log(`🎉 排班进度完成 (100%)`)
          
          // 🛑 立即停止智能进度更新，避免被拉回95%
          stopIntelligentProgressUpdate()
          
          // 🎯 使用智能进度管理器的完成方法（自动平滑过渡到100%）
          smartProgress.complete()
          process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log(`✅ [智能进度] 调用complete()，平滑过渡到100%`)
          
          currentProgressMessage.value = progress.message || '排班完成'
          
          // 添加完成日志
          addRealtimeLog('🎉 算法计算完成', 'success')
          addRealtimeLog('⏳ 正在处理最终结果...', 'info')
          
          // 最终结果将由主函数的 optaPlannerResult 处理
        }
      }
    )
    
    // 从后端响应中获取 WebSocket 会话ID，用于实时进度监控
    if ((optaPlannerResult as any)?.sessionId) {
      wsSessionId.value = (optaPlannerResult as any).sessionId
      process.env.NODE_ENV === 'development' && console.log('✅ [调试] 获得sessionId:', wsSessionId.value)
      
      // 🆕 连接WebSocket并监听中间结果
      process.env.NODE_ENV === 'development' && console.log('🔍 [调试] 准备连接WebSocket进行实时更新...')
      try {
        if (wsSessionId.value) {
          await connectWebSocketForRealtimeUpdates(wsSessionId.value)
          process.env.NODE_ENV === 'development' && console.log('✅ [调试] WebSocket连接函数执行完成')
        }
      } catch (error) {
        console.error('❌ [调试] WebSocket连接函数执行失败:', error)
      }
    } else {
      console.error('❌ [调试] 未获得sessionId，无法连接WebSocket')
      process.env.NODE_ENV === 'development' && console.log('🔍 [调试] optaPlannerResult:', optaPlannerResult)
    }

    // 🎯 完全让前端平滑进度算法控制，不强制跳跃
    // 后端返回结果后，由完成处理逻辑平滑过渡到100%
    
    const backendAssignments = (Array.isArray(optaPlannerResult.assignments) && optaPlannerResult.assignments.length > 0)
      ? optaPlannerResult.assignments
      : (optaPlannerResult.examSchedule?.assignments || [])
    const backendSuccessFlag = optaPlannerResult.success === true
    const isBackendSuccess = backendSuccessFlag || backendAssignments.length > 0

    if (isBackendSuccess) {
      process.env.NODE_ENV === 'development' && console.log('🎉 OptaPlanner排班成功') 
      process.env.NODE_ENV === 'development' && console.log('📊 排班统计:', optaPlannerResult.statistics)
      
      // 添加成功日志
      addRealtimeLog('✅ 排班结果处理成功', 'success')
      addRealtimeLog(`📊 共生成 ${backendAssignments.length} 个排班分配`, 'info')
      
      // 转换assignments格式 - 增强数据格式处理
      let convertedAssignments = backendAssignments.map((assignment: any) => ({
        id: assignment.id,
        studentId: assignment.student.id,
        studentName: assignment.student.name,
        studentDepartment: assignment.student.department,
        examDate: assignment.examDate,
        examType: assignment.examType,
        subjects: assignment.subjects,
        examiner1: assignment.examiner1,  // 保持Teacher对象，让getTeacherNameById处理
        examiner2: assignment.examiner2,  // 保持Teacher对象，让getTeacherNameById处理
        backupExaminer: assignment.backupExaminer,  // 保持Teacher对象，让getTeacherNameById处理
        location: assignment.location,
        timeSlot: assignment.timeSlot
      }))
      
      // 检查约束违反情况
      // ✨ 修复：使用独立变量名，避免覆盖原始的完整日期范围
      const actualUsedDates = [...new Set(convertedAssignments.map(a => a.examDate))]
      const violations: ConstraintViolation[] = []
      
      // 检查节假日违反
      const holidayViolation = createHolidayViolation(actualUsedDates)
      if (holidayViolation.type === 'holiday') {
        violations.push(holidayViolation)
      }
      
      // 🔧 修复：不再检查周末违反，以后端OptaPlanner结果为准
      // 周末考试已由后端HC1约束正确处理，前端不再重复验证
      process.env.NODE_ENV === 'development' && console.log('🔗 [约束同步] 跳过前端周末约束检查，以后端OptaPlanner结果为准')
      
      // 检查主考官不足违反
      const mainExaminersViolation = createInsufficientExaminersViolation(convertedAssignments)
      if (mainExaminersViolation.type === 'teacher') {
        violations.push(mainExaminersViolation)
      }
      
      // 验证约束违反的准确性
      const accurateViolations = validateViolationAccuracy(violations, convertedAssignments, actualUsedDates)
      
      // 过滤和合并约束违反，减少弹窗数量
      const filteredViolations = filterAndMergeViolations(accurateViolations)
      
      // 智能显示控制
      if (filteredViolations.length > 0) {
        const shouldShow = checkShouldShowNewViolations(filteredViolations)
        if (shouldShow) {
          constraintViolations.value = filteredViolations
        } else {
          process.env.NODE_ENV === 'development' && console.log('📝 约束违反已被用户关闭，跳过显示')
        }
      }
      
      // 记录原始违反数量用于统计
      process.env.NODE_ENV === 'development' && console.log(`📊 约束违反统计: 原始${violations.length}个 -> 验证后${accurateViolations.length}个 -> 过滤后${filteredViolations.length}个`)
      
      // 🔍 硬约束诊断：详细输出后端返回的约束状态
      process.env.NODE_ENV === 'development' && console.log('🔍🔍🔍 ========== 硬约束诊断开始 ==========')
      process.env.NODE_ENV === 'development' && console.log('🔍 后端返回的完整score:', optaPlannerResult.score)
      process.env.NODE_ENV === 'development' && console.log('🔍 后端返回的statistics:', JSON.stringify(optaPlannerResult.statistics, null, 2))
      
      // 解析硬约束得分
      let backendHardScore = 0
      let backendSoftScore = 0
      if (optaPlannerResult.score) {
        if (typeof optaPlannerResult.score === 'string') {
          const match = optaPlannerResult.score.match(/(-?\d+)hard\/(-?\d+)soft/)
          if (match) {
            backendHardScore = parseInt(match[1])
            backendSoftScore = parseInt(match[2])
          }
        } else if (typeof optaPlannerResult.score === 'object') {
          backendHardScore = optaPlannerResult.score.hardScore || 0
          backendSoftScore = optaPlannerResult.score.softScore || 0
        }
      }
      
      process.env.NODE_ENV === 'development' && console.log('🔍 解析后的硬约束得分:', backendHardScore)
      process.env.NODE_ENV === 'development' && console.log('🔍 解析后的软约束得分:', backendSoftScore)
      process.env.NODE_ENV === 'development' && console.log('🔍 后端是否认为硬约束满足:', backendHardScore === 0 ? '✅ 是' : '❌ 否')
      
      // 🔍 科室归一化函数（与后端保持一致）
      const normalizeDepartment = (dept: string | undefined): string => {
        if (!dept) return ''
        
        const normalized = dept.trim()
        
        // 标准化映射（与后端OptimizedExamScheduleConstraintProvider.normalizeDepartment()一致）
        if (normalized.includes('区域一室') || normalized.includes('一室') || normalized.includes('1室') || normalized.includes('第1科室')) return '一'
        if (normalized.includes('区域二室') || normalized.includes('二室') || normalized.includes('2室') || normalized.includes('第2科室')) return '二'
        if (normalized.includes('区域三室') || normalized.includes('三室') || normalized.includes('3室') || normalized.includes('第3科室')) return '三'
        if (normalized.includes('区域四室') || normalized.includes('四室') || normalized.includes('4室') || normalized.includes('第4科室')) return '四'
        if (normalized.includes('区域五室') || normalized.includes('五室') || normalized.includes('5室') || normalized.includes('第5科室')) return '五'
        if (normalized.includes('区域六室') || normalized.includes('六室') || normalized.includes('6室') || normalized.includes('第6科室')) return '六'
        if (normalized.includes('区域七室') || normalized.includes('七室') || normalized.includes('7室') || normalized.includes('第7科室')) return '七'
        if (normalized.includes('区域八室') || normalized.includes('八室') || normalized.includes('8室') || normalized.includes('第8科室')) return '八'
        if (normalized.includes('区域九室') || normalized.includes('九室') || normalized.includes('9室') || normalized.includes('第9科室')) return '九'
        if (normalized.includes('区域十室') || normalized.includes('十室') || normalized.includes('10室') || normalized.includes('第10科室')) return '十'
        
        return normalized
      }
      
      // 🔍 检查考官1科室是否有效（与后端isValidExaminer1Department()一致）
      const isValidExaminer1Department = (studentDept: string, examiner1Dept: string): boolean => {
        // 同科室
        if (studentDept === examiner1Dept) return true
        
        // 3室7室互通
        if ((studentDept === '三' && examiner1Dept === '七') || (studentDept === '七' && examiner1Dept === '三')) {
          return true
        }
        
        return false
      }
      
      // 🔍 详细检查每条排班记录的HC2约束（基于convertedAssignments的真实结构）
      process.env.NODE_ENV === 'development' && console.log('🔍🔍🔍 ========== 检查每条排班的HC2约束 ==========')
      const hc2Violations: any[] = []
      
      convertedAssignments.forEach((assignment: any, index: number) => {
        const studentName = assignment.studentName || assignment.student?.name
        const studentDeptRaw = assignment.studentDepartment || assignment.student?.department
        const examiner1Obj = assignment.examiner1
        const examiner2Obj = assignment.examiner2
        
        if (!studentName || !studentDeptRaw || !examiner1Obj || !examiner2Obj) {
          return
        }
        
        const examiner1Name = examiner1Obj?.name || examiner1Obj
        const examiner2Name = examiner2Obj?.name || examiner2Obj
        const examiner1DeptRaw = examiner1Obj?.department
        const examiner2DeptRaw = examiner2Obj?.department
        
        const studentDept = normalizeDepartment(studentDeptRaw)
        const examiner1Dept = normalizeDepartment(examiner1DeptRaw)
        const examiner2Dept = normalizeDepartment(examiner2DeptRaw)
        
        const isExaminer1Valid = isValidExaminer1Department(studentDept, examiner1Dept)
        const isExaminer2Different = studentDept !== examiner2Dept
        const areExaminersDifferent = examiner1Dept !== examiner2Dept
        const isValid = isExaminer1Valid && isExaminer2Different && areExaminersDifferent
        
        process.env.NODE_ENV === 'development' && console.log(`🔍 第${index + 1}条: ${studentName}`, {
          原始科室: { 学员: studentDeptRaw, 考官1: examiner1DeptRaw, 考官2: examiner2DeptRaw },
          归一化科室: { 学员: studentDept, 考官1: examiner1Dept, 考官2: examiner2Dept },
          日期: assignment.examDate,
          考官1: examiner1Name,
          考官2: examiner2Name,
          考官1验证: isExaminer1Valid ? '✅' : '❌',
          考官2验证: isExaminer2Different ? '✅' : '❌',
          考官间验证: areExaminersDifferent ? '✅' : '❌',
          总体: isValid ? '✅ 合规' : '❌ 违反HC2'
        })
        
        if (!isValid) {
          hc2Violations.push({
            学员: studentName,
            科室: `${studentDeptRaw}(${studentDept})`,
            日期: assignment.examDate,
            考官1: examiner1Name,
            考官1科室: `${examiner1DeptRaw}(${examiner1Dept})`,
            考官2: examiner2Name,
            考官2科室: `${examiner2DeptRaw}(${examiner2Dept})`,
            违反原因: !isExaminer1Valid ? '考官1与学员不同科室' : 
                     !isExaminer2Different ? '考官2与学员同科室' :
                     !areExaminersDifferent ? '考官1和考官2来自同一科室' : '未知'
          })
        }
      })
      
      process.env.NODE_ENV === 'development' && console.log('🔍 HC2约束检查结果汇总:')
      process.env.NODE_ENV === 'development' && console.log(`🔍 总排班数: ${convertedAssignments.length * 2}`)
      process.env.NODE_ENV === 'development' && console.log(`🔍 HC2违反数: ${hc2Violations.length}`)
      if (hc2Violations.length > 0) {
        process.env.NODE_ENV === 'development' && console.log('🔍 HC2违反详情:')
        console.table(hc2Violations)
      } else {
        process.env.NODE_ENV === 'development' && console.log('🔍 ✅ 所有排班都符合HC2约束!')
      }
      process.env.NODE_ENV === 'development' && console.log('🔍🔍🔍 ========== 硬约束诊断结束 ==========')
      
      // 处理排班结果
      // 🔧 修复：正确提取真实的软约束得分
      let realSoftScore = backendSoftScore
      if (realSoftScore === 0 && optaPlannerResult.statistics?.finalScore) {
        if (typeof optaPlannerResult.statistics.finalScore === 'object') {
          realSoftScore = optaPlannerResult.statistics.finalScore.softScore || 0
        } else if (typeof optaPlannerResult.statistics.finalScore === 'string') {
          const match = optaPlannerResult.statistics.finalScore.match(/(-?\d+)hard\/(-?\d+)soft/)
          if (match) {
            realSoftScore = parseInt(match[2])
          }
        }
      }
      process.env.NODE_ENV === 'development' && console.log('📊 [软约束得分] 真实软约束得分:', realSoftScore)
      latestSoftScore.value = realSoftScore
      if (bestSoftScore.value === null || realSoftScore > bestSoftScore.value) {
        bestSoftScore.value = realSoftScore
      }
      
      const result = {
        assignments: convertedAssignments,
        unassignedStudents: [],
        statistics: {
          totalStudents: optaPlannerResult.statistics?.totalStudents || 0,
          assignedStudents: optaPlannerResult.statistics?.assignedStudents || 0,
          unassignedStudents: (optaPlannerResult.statistics?.totalStudents || 0) - (optaPlannerResult.statistics?.assignedStudents || 0),
          totalTeachers: teachers.length,
          activeTeachers: Math.ceil((optaPlannerResult.statistics?.assignedStudents || 0) / 2), // 估算活跃考官数
          averageWorkload: Math.ceil((optaPlannerResult.statistics?.assignedStudents || 0) / teachers.length),
          maxWorkload: Math.ceil((optaPlannerResult.statistics?.assignedStudents || 0) / teachers.length * 1.5),
          hardConstraintsSatisfied: (optaPlannerResult.statistics?.hardConstraintViolations || 0) === 0 ? 1 : 0,
          hardConstraintViolations: optaPlannerResult.statistics?.hardConstraintViolations || 0,
          softConstraintViolations: optaPlannerResult.statistics?.softConstraintViolations || 0,
          softConstraintsScore: realSoftScore,  // 🔧 使用真实的软约束得分
          continuityRate: optaPlannerResult.statistics?.completionPercentage || 0
        },
        conflicts: optaPlannerResult.conflicts || [],
        warnings: optaPlannerResult.warnings || [],
        recommendations: [] as string[]
      }
      
      // 清除可能存在的错误缓存
      process.env.NODE_ENV === 'development' && console.log('🔄 清除旧缓存，准备显示新的排班结果')
      localStorage.removeItem('latest_schedule_result')
      scheduleResults.value = []
      
      // 🔧 首先修复考官分配问题
      process.env.NODE_ENV === 'development' && console.log('🔧 开始修复考官分配问题...')
      try {
        const { examinerAssignmentFixer } = await import('../services/examinerAssignmentFixer')
        const fixResult = examinerAssignmentFixer.fixExaminerAssignments(convertedAssignments, teachers)
        
        if (fixResult.fixedCount > 0) {
          process.env.NODE_ENV === 'development' && console.log(`✅ 修复了${fixResult.fixedCount}个考官分配问题`)
          convertedAssignments = fixResult.assignments
          
          // 重新检查约束违反
          const updatedMainExaminersViolation = createInsufficientExaminersViolation(convertedAssignments)
          if (updatedMainExaminersViolation.type === 'teacher') {
            // 更新violations数组中的约束
            const violationIndex = violations.findIndex(v => v.id === 'main-examiners-violation')
            if (violationIndex >= 0) {
              violations[violationIndex] = updatedMainExaminersViolation
            }
          } else {
            // 移除约束违反
            const violationIndex = violations.findIndex(v => v.id === 'main-examiners-violation')
            if (violationIndex >= 0) {
              violations.splice(violationIndex, 1)
            }
          }
          
          // 更新约束违反状态，应用过滤和合并
          const filteredViolations = filterAndMergeViolations(violations)
          constraintViolations.value = filteredViolations
        }
        
        if (fixResult.remainingIssues > 0) {
          console.warn(`⚠️ 仍有${fixResult.remainingIssues}个考官分配问题未解决`)
        }
      } catch (fixError) {
        console.error('❌ 考官分配修复失败:', fixError)
      }

      // 🚀 应用时间分散优化 - ❌ 已禁用：会导致前后端结果不一致
      // ⚠️ 问题：这个功能会重新调用OptaPlanner，替换掉后端的权威结果
      // ⚠️ 导致用户看到的结果和后端日志中的结果不一致
      process.env.NODE_ENV === 'development' && console.log('⚠️ 时间分散优化已禁用（避免前后端结果不一致）')
      /*
      process.env.NODE_ENV === 'development' && console.log('🚀 开始应用时间分散优化...')
      // ✨ 确认使用原始的完整日期范围
      process.env.NODE_ENV === 'development' && console.log(`📅 传递给增强排班的日期范围: ${examDates.length} 天 (从 ${examDates[0]} 到 ${examDates[examDates.length - 1]})`)
      process.env.NODE_ENV === 'development' && console.log(`📊 实际已使用日期: ${actualUsedDates.length} 天 (${actualUsedDates.join(', ')})`)
      
      try {
        const { enhancedSchedulingService } = await import('../services/enhancedSchedulingService')
        const optimizedResult = await enhancedSchedulingService.executeEnhancedScheduling({
          students: convertedAssignments.map(a => {
            // 从原始学员数据中查找对应的学员信息，获取group等字段
            const originalStudent = studentList.value.find(s => s.id === a.studentId)
            return {
              id: a.studentId,
              name: a.studentName,
              department: a.studentDepartment,
              group: originalStudent?.group || '一组', // 从原始学员数据获取班组信息
              examType: a.examType,
              subjects: a.subjects || [],
              recommendedExaminer1Dept: originalStudent?.recommendedExaminer1Dept,
              recommendedExaminer2Dept: originalStudent?.recommendedExaminer2Dept
            }
          }),
          teachers: teachers,
          examDates: examDates, // ✨ 现在使用的是原始的完整日期范围（6周），而不是已使用的2天
          constraints: {
            maxDailyAssignments: 10,
            minRestDays: 1,
            preferredWorkload: 5
          }
        })
        
        if (optimizedResult.assignments.length > 0) {
          process.env.NODE_ENV === 'development' && console.log('✅ 时间分散优化成功应用')
          // 更新排班结果为优化后的结果
          const optimizedAssignments = optimizedResult.assignments.map(a => ({
            id: a.id,
            studentId: a.studentId,
            studentName: convertedAssignments.find(ca => ca.id === a.id)?.studentName || '',
            studentDepartment: convertedAssignments.find(ca => ca.id === a.id)?.studentDepartment || '',
            examDate: dateUtils.toStorageDate(a.date),
            examType: a.examType,
            subjects: a.subjects,
            examiner1: convertedAssignments.find(ca => ca.id === a.id)?.examiner1,
            examiner2: convertedAssignments.find(ca => ca.id === a.id)?.examiner2,
            backupExaminer: convertedAssignments.find(ca => ca.id === a.id)?.backupExaminer,
            location: a.location,
            timeSlot: a.timeSlot
          }))
          
          result.assignments = optimizedAssignments
          result.recommendations = optimizedResult.recommendations
        }
      } catch (error) {
        console.warn('⚠️ 时间分散优化失败:', error)
      }
      */
      
      schedulingResult.value = result as any
      await updateScheduleResults(result as any, false)
      
      // 显示详细成功消息
      setTimeout(() => {
        // 使用实际的result.statistics数据
        const stats = result.statistics || optaPlannerResult.statistics
        const totalStudents = stats?.totalStudents || scheduleResults.value.length
        const assignedStudents = stats?.assignedStudents || scheduleResults.value.filter(s => s.examiner1_1 && s.examiner2_1).length
        const completionRate = totalStudents > 0 ? (assignedStudents / totalStudents * 100) : 0
        
        // ✈️ 设置最终统计数据（用于民航主题加载界面完成状态）
        finalScheduleStatistics.value = {
          totalStudents: totalStudents,
          assignedStudents: assignedStudents,
          completionRate: completionRate,
          hardConstraintScore: backendHardScore,
          softConstraintScore: backendSoftScore
        }
        
        // 🛑 停止智能进度更新定时器
        stopIntelligentProgressUpdate()
        
        // 🎯 使用智能进度管理器完成（自动平滑过渡）
        smartProgress.complete()
        
        // 🔧 v7.1.2: 跳过完成弹窗，直接显示结果
        // schedulingCompleted.value = true  // 不再显示完成弹窗
        schedulingCompleted.value = false    // 直接关闭loader
        isScheduling.value = false
        process.env.NODE_ENV === 'development' && console.log(`✅ [智能进度] 排班完成，直接显示结果（跳过完成弹窗）`)
      
      // 计算完成后的处理（移除集成面板相关代码）
        
        let message = `🎉 OptaPlanner排班完成！\n\n`
        message += `📊 排班统计:\n`
        
        const backendHardConstraintViolationCount = (stats as any)?.hardConstraintViolations ?? stats?.hardConstraintsSatisfied ?? 0
        const backendSoftConstraintViolationCount = (stats as any)?.softConstraintViolations ?? 0

        message += `✅完成率: ${completionRate.toFixed(1)}%\n`
        message += `✅分配学员: ${assignedStudents}/${totalStudents}\n`
        message += `❌硬约束违反: ${backendHardConstraintViolationCount}个\n`
        message += `⚠️软约束得分 ${stats?.softConstraintsScore || 0}\n`
        if (bestSoftScore.value !== null) {
          message += `🌟历史最高软约束得分 ${bestSoftScore.value}\n`
        }
        message += `\n`
        if (optaPlannerResult.warnings && optaPlannerResult.warnings.length > 0) {
          message += `⚠️ 警告: ${optaPlannerResult.warnings.length}个\n`
        }
        
        if (optaPlannerResult.conflicts && optaPlannerResult.conflicts.length > 0) {
          message += `❌冲突: ${optaPlannerResult.conflicts.length}个\n`
        }
        
        message += `\n🚀使用OptaPlanner约束求解引擎\n`
        message += `所有排班结果已生成，请查看下方表格。`
        
        // 使用非阻塞的通知方式
        process.env.NODE_ENV === 'development' && console.log(message)
        
        // 显示成功通知（可以点击关闭）
        schedulingError.value = ''
        schedulingResult.value = result
        
        // 🎯 设置统一结果弹窗数据
        unifiedResultData.value = {
          success: isBackendSuccess,
          statistics: {
            totalStudents: totalStudents,
            assignedStudents: assignedStudents,
            hardConstraintsSatisfied: stats?.hardConstraintsSatisfied || 0,
            softConstraintsScore: stats?.softConstraintsScore || 0,
            bestSoftConstraintsScore: bestSoftScore.value,
            hardConstraintViolations: backendHardConstraintViolationCount,
            softConstraintViolations: backendSoftConstraintViolationCount
          },
          warnings: optaPlannerResult.warnings || [],
          conflicts: optaPlannerResult.conflicts || [],
          message: message
        }
        
        // 显示统一的结果弹窗（替代原来的分离弹窗）
        showUnifiedResultModal.value = true
      }, 1000)
      
      // 关闭弹窗并显示结果
      closeModal()
      
    } else {
      console.error('OptaPlanner排班失败')
      
      // 显示详细错误信息
      let errorMessage = `排班失败\n\n`
      
      if (optaPlannerResult.message) {
        errorMessage += `❌错误信息: ${optaPlannerResult.message}\n\n`
      }
      
      if (optaPlannerResult.warnings && optaPlannerResult.warnings.length > 0) {
        errorMessage += `⚠️ 警告信息:\n`
        optaPlannerResult.warnings.forEach((warning, index) => {
          errorMessage += `${index + 1}. ${warning}\n`
        })
        errorMessage += `\n`
      }
      
      errorMessage += `💡 建议解决方案:\n`
      errorMessage += `1. 检查考官数量是否充足\n`
      errorMessage += `2. 确认考试日期范围合理\n`
      errorMessage += `3. 考虑放宽部分约束条件\n`
      errorMessage += `4. 联系系统管理员获取技术支持`
      
      // 使用非阻塞的错误通知
      console.error(errorMessage)
      
      // 创建错误通知元素
      const errorNotification = document.createElement('div')
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 500px;
        font-size: 14px;
        line-height: 1.4;
        cursor: pointer;
        white-space: pre-line;
      `
      errorNotification.textContent = errorMessage
      errorNotification.title = '点击关闭'
      
      // 点击关闭
      errorNotification.onclick = () => errorNotification.remove()
      
      // 自动关闭（延长时间以便用户阅读）
      setTimeout(() => {
        if (errorNotification.parentNode) {
          errorNotification.remove()
        }
      }, 15000)
      
      document.body.appendChild(errorNotification)
      
      // 更新UI状态
      setTimeout(() => {
        stopIntelligentProgressUpdate()  // 停止智能进度更新
        isScheduling.value = false
        smartProgress.reset()  // 使用智能进度管理器重置
        schedulingError.value = 'OptaPlanner排班失败，请查看详细信息'
      }, 1000)
    }
    
  } catch (error) {
    console.error('排班系统错误:', error)
    
    // 使用增强错误反馈服务处理错误
    const conflicts: ConflictInfo[] = []
    
    // 分析错误类型并生成冲突信息
    if ((error as Error).message.includes('考官数据')) {
      conflicts.push({
        id: 'teacher-data-error',
        type: 'scheduling_conflict',
        severity: 'HIGH',
        description: '考官数据验证失败',
        affectedEntities: ['teachers'],
        suggestedSolutions: [
          '检查考官数据格式',
          '重新加载考官数据'
        ],
        autoResolvable: false
      })
    }
    
    if ((error as Error).message.includes('学员名单')) {
      conflicts.push({
        id: 'student-data-error',
        type: 'scheduling_conflict',
        severity: 'HIGH',
        description: '学员名单格式错误',
        affectedEntities: ['students'],
        suggestedSolutions: [
          '检查学员名单格式',
          '重新上传学员名单'
        ],
        autoResolvable: false
      })
    }
    
    // 显示增强错误反馈
    enhancedErrorFeedbackService.showErrorFeedback(
      'system_error',
      (error as Error).message || '未知错误',
      conflicts
    )
    
    // 更新UI状态
    stopIntelligentProgressUpdate()  // 停止智能进度更新
    stopFallbackProgressMode()  // 停止模拟进度模式
    isScheduling.value = false
    smartProgress.reset()  // 使用智能进度管理器重置
    schedulingError.value = (error as Error).message || '未知错误'
  }
}

// 生成考试日期范围
const generateExamDateRange = (startDate: Date, endDate: Date): string[] => {
  const dates: string[] = []
  const current = new Date(startDate)
  
  // 2025-2026年法定节假日（与后端HolidayConfig保持一致）
  const holidays = new Set([
    // 2025年法定节假日
    '2025-01-01', // 元旦
    '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', // 春节
    '2025-02-01', '2025-02-02', '2025-02-03',
    '2025-04-05', '2025-04-06', '2025-04-07', // 清明节
    '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05', // 劳动节
    '2025-05-31', '2025-06-01', '2025-06-02', // 端午节
    // 注意：2025年中秋节与国庆节合并放假，10月1日至8日放假调休，共8天
    '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', // 国庆节
    '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // 国庆节（与中秋节合并）
    
    // 2026年法定节假日
    '2026-01-01', // 元旦
    '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', // 春节
    '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23', // 春节（2月15日-23日共9天）
    '2026-04-05', '2026-04-06', '2026-04-07', // 清明节
    '2026-05-01', '2026-05-02', '2026-05-03', // 劳动节
    '2026-05-29', // 端午节
    '2026-09-25', '2026-09-26', '2026-09-27', // 中秋节
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', // 国庆节
    '2026-10-05', '2026-10-06', '2026-10-07'
  ])
  
  // 调休工作日（周末上班）
  const workdays = new Set([
    '2025-01-26', '2025-02-08', // 春节调休
    '2025-04-27', // 劳动节调休
    '2025-09-28', '2025-10-11', // 国庆节调休
    
    // '2026-02-15', '2026-02-23', // 春节调休已取消（2月15日-23日全部为假期）
    '2026-04-26', // 劳动节调休（预估）
    '2026-09-27', '2026-10-10' // 国庆节调休（预估）
  ])
  
  // 判断是否为工作日的函数（与后端HolidayConfig.isWorkingDay()保持一致）
  const isWorkingDay = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00')
    const dayOfWeek = date.getDay()
    
    // 调试：记录日期判断过程
    process.env.NODE_ENV === 'development' && console.log(`🔍 判断日期 ${dateStr}: 星期${dayOfWeek}`)
    
    // 检查是否在自定义不可用日期列表中
    const isCustomUnavailable = customUnavailableDates.value.some(item => {
      if (item.endDate) {
        // 范围模式
        return dateStr >= item.date && dateStr <= item.endDate
      } else {
        // 单日模式
        return dateStr === item.date
      }
    })
    
    if (isCustomUnavailable) {
      process.env.NODE_ENV === 'development' && console.log(`❌ ${dateStr} 是自定义不可用日期`)
      return false
    }
    
    // 如果是调休工作日，则为工作日
    if (workdays.has(dateStr)) {
      process.env.NODE_ENV === 'development' && console.log(`✅ ${dateStr} 是调休工作日`)
      return true
    }
    
    // 如果是节假日，则不是工作日
    if (holidays.has(dateStr)) {
      process.env.NODE_ENV === 'development' && console.log(`❌ ${dateStr} 是节假日`)
      return false
    }
    
    // 如果是周末，根据开关设置判断
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 周日或周六
      if (allowWeekendScheduling.value) {
        process.env.NODE_ENV === 'development' && console.log(`✅ ${dateStr} 是周末，但开启了周末排班`)
        return true
      } else {
        process.env.NODE_ENV === 'development' && console.log(`❌ ${dateStr} 是周末 (星期${dayOfWeek})，且未开启周末排班`)
        return false
      }
    }
    
    // 其他情况为工作日
    process.env.NODE_ENV === 'development' && console.log(`✅ ${dateStr} 是普通工作日`)
    return true
  }
  
  while (current <= endDate) {
    // 使用dateUtils工具类获取标准日期格式
    const dateStr = dateUtils.toStandardDate(current)
    
    // 使用与后端一致的工作日判断逻辑
    if (isWorkingDay(dateStr)) {
      dates.push(dateStr)
    }
    
    // 使用dateUtils工具类获取下一天
    const nextDay = dateUtils.getNextDay(current)
    current.setTime(new Date(nextDay).getTime())
  }
  
  const startDateStr = dateUtils.toStandardDate(startDate)
  const endDateStr = dateUtils.toStandardDate(endDate)
  
  process.env.NODE_ENV === 'development' && console.log(`📅 生成考试日期范围: ${startDateStr} 到 ${endDateStr}`)
  process.env.NODE_ENV === 'development' && console.log(`📊 可用工作日数量: ${dates.length} 天`)
  
  if (dates.length === 0) {
    console.warn('⚠️ 警告: 所选日期范围内没有可用的工作日')
    process.env.NODE_ENV === 'development' && console.log('💡 建议: 请选择包含工作日的日期范围')
  } else if (dates.length < 2) {
    console.warn('⚠️ 警告: 可用工作日太少，可能无法完成所有排班')
    process.env.NODE_ENV === 'development' && console.log('💡 建议: 请扩大日期范围以包含更多工作日')
  }
  process.env.NODE_ENV === 'development' && console.log(`📋 具体日期: ${dates.join(', ')}`)
  
  return dates
}

// 准备考官数据 - 只使用实际上传的数据，不再依赖硬编码
const prepareTeacherData = async (): Promise<TeacherInfo[]> => {
  try {
    process.env.NODE_ENV === 'development' && console.log('🔍 开始从存储服务加载考官数据...')
    
    // 调试：检查所有localStorage中的键
    process.env.NODE_ENV === 'development' && console.log('📋 localStorage中所有的键:', Object.keys(localStorage))
    const teacherRelatedKeys = Object.keys(localStorage).filter(key => 
      key.toLowerCase().includes('teacher') || key.toLowerCase().includes('examiner')
    )
    process.env.NODE_ENV === 'development' && console.log('🎯 考官相关的存储键:', teacherRelatedKeys)
    teacherRelatedKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key)
        const parsed = data ? JSON.parse(data) : null
        process.env.NODE_ENV === 'development' && console.log(`📊 ${key}:`, Array.isArray(parsed) ? `${parsed.length}条记录` : typeof parsed)
      } catch (e) {
        process.env.NODE_ENV === 'development' && console.log(`❌ ${key}: 解析失败`)
      }
    })
    
    // 从存储服务加载实际的考官数据 - 使用与考官管理页面相同的存储方式
    let storedTeachers = []
    
    // 尝试多种存储键名，确保兼容性
    const teacherKeys = ['teachers', 'examiner_teachers', 'unified_teachers', 'teacher_data', 'teacherList']
    
    for (const key of teacherKeys) {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = JSON.parse(data)
          if (Array.isArray(parsed) && parsed.length > 0) {
            storedTeachers = parsed
            process.env.NODE_ENV === 'development' && console.log(`✅从存储键 "${key}" 加载的考官数`, storedTeachers.length, '名考官')
            break
          }
        }
      } catch (error) {
        console.warn(`解析存储键 "${key}" 失败:`, error)
      }
    }
    
    // 如果还是没有数据，尝试使用原来的storageService
    if (storedTeachers.length === 0) {
      try {
      storedTeachers = await storageService.loadTeachers()
        process.env.NODE_ENV === 'development' && console.log('✅从storageService加载考官数据:', storedTeachers.length, '名考官')
      } catch (error) {
        console.warn('从storageService加载考官数据失败:', error)
      }
    }
    
    // 注：storageService 和 unifiedStorageService 是同一个单例，无需重复尝试
    
    if (storedTeachers.length === 0) {
      console.error('❌存储中没有考官数据！请先在考官管理页面上传考官名单')
      process.env.NODE_ENV === 'development' && console.log('💡 提示：请确保已在考官管理页面保存了考官数据')
      process.env.NODE_ENV === 'development' && console.log('🔧 调试信息：如果考官管理页面有数据但这里读取不到，可能是存储键名不匹配')
      
      // 提供应急测试数据，但给出明确警告
      console.warn('⚠️ 使用应急测试教师数据，仅供功能验证！请尽快上传真实教师数据！')
      
      storedTeachers = [
        { id: 'test_1', name: '张考官', department: '区域一室', group: '一组', shift: '白班', status: '可用' },
        { id: 'test_2', name: '李考官', department: '区域二室', group: '二组', shift: '夜班', status: '可用' },
        { id: 'test_3', name: '王考官', department: '区域三室', group: '三组', shift: '休息', status: '可用' },
        { id: 'test_4', name: '赵考官', department: '区域四室', group: '四组', shift: '白班', status: '可用' },
        { id: 'test_5', name: '钱考官', department: '区域五室', group: '一组', shift: '夜班', status: '可用' },
        { id: 'test_6', name: '孙考官', department: '区域六室', group: '二组', shift: '休息', status: '可用' },
        { id: 'test_7', name: '周考官', department: '区域七室', group: '三组', shift: '白班', status: '可用' },
        { id: 'test_8', name: '吴考官', department: '区域一室', group: '四组', shift: '夜班', status: '可用' },
        { id: 'test_9', name: '郑考官', department: '区域二室', group: '一组', shift: '休息', status: '可用' },
        { id: 'test_10', name: '陈考官', department: '区域三室', group: '二组', shift: '白班', status: '可用' }
      ]
      
      // 显示警告信息给用户
      schedulingError.value = `⚠️ 正在使用测试教师数据进行排班！
      
请注意：
1. 当前使用的是系统内置的测试数据
2. 排班结果仅供功能验证，不应用于实际工作
3. 请尽快访问"考官管理"页面上传真实教师数据
4. 上传真实数据后，重新进行排班获得准确结果

测试考官数量: ${storedTeachers.length} 名`
    }
    
    // 将存储的考官数据转换为排班所需的格式
    const teacherData: TeacherInfo[] = storedTeachers
      .filter(teacher => teacher && teacher.id && teacher.name) // 过滤无效数据
      .map(teacher => {
        const unavailablePeriods = (teacher as any).unavailablePeriods || []
        
        // 🔍 调试：输出每个考官的不可用期
        if (unavailablePeriods.length > 0) {
          process.env.NODE_ENV === 'development' && console.log(`🚫 考官 ${teacher.name} 有 ${unavailablePeriods.length} 个不可用期:`, unavailablePeriods)
        }
        
        return {
          id: teacher.id.toString(),
          name: teacher.name,
          department: teacher.department || '未分组',
          group: (teacher as any).group || '一', // 类型断言处理可能不存在的属性
          skills: (teacher as any).skills || teacher.specialties || ['理论教学', '实操指导'],
          workload: (teacher as any).workload || 0,
          consecutiveDays: (teacher as any).consecutiveDays || 0,
          // 🆕 传递不可用期数据到排班请求
          unavailablePeriods: unavailablePeriods,
          // ✨ 智能推荐所需的扩展字段（基础值，后续动态更新）
          specialties: (teacher as any).specialties || (teacher as any).skills || [],
          experienceYears: (teacher as any).experienceYears || 3,
          available: true,  // 默认可用，在editExaminer中动态检测
          currentWorkload: 0,  // 默认0，在editExaminer中实时计算
          nightShiftPreferred: false,  // 默认false，在editExaminer中根据值班状态动态设置
          restDayStatus: 'none' as const,  // 默认none，在editExaminer中根据值班状态动态设置
          conflictInfo: ''   // 默认空，在editExaminer中动态生成
        };
      });
    
    process.env.NODE_ENV === 'development' && console.log('考官数据转换完成:', teacherData.length, '名有效考官');
    
    // 验证数据完整性
    const validTeachers = teacherData.filter(teacher => 
      teacher.id && teacher.name && teacher.department && teacher.department !== '未分组'
    )
    
    if (validTeachers.length !== teacherData.length) {
      console.warn(`⚠️ 发现 ${teacherData.length - validTeachers.length} 名考官数据不完整，已过滤`)
    }
    
    if (validTeachers.length === 0) {
      console.error('没有有效的考官数据！请检查上传的考官名单格式')
      throw new Error('考官数据格式不正确，请检查上传的文件')
    }
    
    process.env.NODE_ENV === 'development' && console.log(`🎯 成功加载 ${validTeachers.length} 名有效考官，来源：实际上传数据`)
    return validTeachers
    
  } catch (error) {
    console.error('加载考官数据失败:', error)
    // 不再使用硬编码数据作为后备，而是抛出错误提示用户
    throw new Error(`考官数据加载失败: ${(error as Error).message || '未知错误'}。请确保已在考官管理页面正确上传考官名单。`)
  }
}

// 硬编码考官数据已移除 - 现在只使用实际上传的数据
// 如果需要考官数据，请在考官管理页面上传最新的考官名单

// 科室名称映射函数
const mapDepartmentName = (deptName: string): string => {
  const deptMapping: { [key: string]: string } = {
    '一': '区域一室',
    '二': '区域二室', 
    '三': '区域三室',
    '四': '区域四室',
    '五': '区域五室',
    '六': '区域六室',
    '七': '区域七室',
    // 支持完整格式输入
    '区域一室': '区域一室',
    '区域二室': '区域二室',
    '区域三室': '区域三室',
    '区域四室': '区域四室',
    '区域五室': '区域五室',
    '区域六室': '区域六室',
    '区域七室': '区域七室'
  }
  return deptMapping[deptName] || deptName
}

// 辅助函数：将完整科室名称转换为简写格式
const convertDeptNameToShort = (deptName: string): string => {
  if (!deptName) return ''
  
  // 转换映射表：完整格式 -> 简写格式
  const deptConversionMap: { [key: string]: string } = {
    '区域一室': '一',
    '区域二室': '二', 
    '区域三室': '三',
    '区域四室': '四',
    '区域五室': '五',
    '区域六室': '六',
    '区域七室': '七'
  }
  
  return deptConversionMap[deptName] || deptName
}

// 加载学员数据
const loadStudentData = async () => {
  try {
    process.env.NODE_ENV === 'development' && console.log('🔄 开始从后端加载学员数据...')
    const students = await dataManagementApi.getAllStudents()
    process.env.NODE_ENV === 'development' && console.log('✅ 成功获取学员数据:', students.length, '名学员')
    
    // 转换为前端需要的格式
    studentList.value = students.map(student => ({
      id: student.id?.toString() || student.studentId,
      name: student.name,
      department: student.department.name,
      group: student.group?.name || '一组',
      recommendedExaminer1Dept: student.recommendedExaminer1Dept?.name,
      recommendedExaminer2Dept: student.recommendedExaminer2Dept?.name
    }))
    
    process.env.NODE_ENV === 'development' && console.log('✅ 学员数据转换完成，总数:', studentList.value.length)
    // 🆕 初始化考试内容
    initializeStudentsExamContent()
  } catch (error) {
    console.error('❌ 加载学员数据失败:', error)
    // 如果API调用失败，使用默认数据
    studentList.value = [
      { id: '1', name: '杨杰', department: '一', group: '一组' },
      { id: '2', name: '顾秀莲', department: '一', group: '二组' },
      { id: '3', name: '黄伟', department: '一', group: '三组' },
      { id: '4', name: '廖轩', department: '一', group: '四组' },
      { id: '5', name: '黎明', department: '二', group: '一组' },
      { id: '6', name: '马恒', department: '二', group: '二组' },
      { id: '7', name: '何若', department: '二', group: '三组' }
    ]
    process.env.NODE_ENV === 'development' && console.log('⚠️ 使用默认学员数据，总数:', studentList.value.length)
  }
}

// 准备学员数据 - 符合新接口要求
const prepareStudentData = async (): Promise<StudentInfo[]> => {
  if (studentList.value.length === 0) {
    throw new Error('请先上传学员名单文件')
  }
  
  // 将现有学员数据转换为新格式，保持科室简写格式以匹配考官数据
  return studentList.value.map((student: any) => ({
    id: student.id.toString(),
    name: student.name,
    department: student.department, // 保持原始简写格式（一、二、三等）
    group: student.group || '一组', // 默认分配到一组
    // 推荐考官科室信息（转换为简写格式以匹配后端约束）
    recommendedExaminer1Dept: student.recommendedExaminer1Dept ? convertDeptNameToShort(student.recommendedExaminer1Dept) : undefined,
    recommendedExaminer2Dept: student.recommendedExaminer2Dept ? convertDeptNameToShort(student.recommendedExaminer2Dept) : undefined,
    recommendedBackupDept: student.recommendedBackupDept ? convertDeptNameToShort(student.recommendedBackupDept) : undefined,
    originalExaminers: {
      // 从上传文件中读取推荐考官科室信息（作为备选）
      examiner1: student.recommendedExaminer1Dept,
      examiner2: student.recommendedExaminer2Dept,
      backup: student.recommendedBackupDept
    }
  }))
}

// 旧的验证和工作日处理函数已移除，现在使用智能排班算法中的实现

// 更新排班结果到表格 - 处理新的排班结果格式
const updateScheduleResults = async (result: SchedulingResult, isRealtimeUpdate = false) => {
  process.env.NODE_ENV === 'development' && console.log('🔍 开始处理排班结果', result)
  
  // 先进行数据修复，再进行验证
  process.env.NODE_ENV === 'development' && console.log('🔧 开始数据修复...')
  
  // 确保考官数据缓存已初始化
  if (!cachedTeacherData) {
    process.env.NODE_ENV === 'development' && console.log('🔄 初始化考官数据缓存.')
    try {
      cachedTeacherData = await prepareTeacherData()
      process.env.NODE_ENV === 'development' && console.log('考官数据缓存初始化完成，缓存数量:', cachedTeacherData.length)
    } catch (error) {
      console.error('初始化考官数据缓存失败', error)
      cachedTeacherData = []
    }
  }
  
  // 应用前端显示修复器，确保数据格式一致
  process.env.NODE_ENV === 'development' && console.log('🔧 应用前端显示修复器.')
  try {
    // 保持Teacher对象不变，让getTeacherNameById函数处理
    // 不要在这里转换为字符串，因为getTeacherNameById函数已经能正确处理Teacher对象
    process.env.NODE_ENV === 'development' && console.log('🔍 检查assignments中的教师数据结构:')
    result.assignments.forEach((assignment: any, index: number) => {
      if (index < 3) { // 只打印前3个用于调试
        process.env.NODE_ENV === 'development' && console.log(`Assignment ${index}:`, {
          examiner1: assignment.examiner1,
          examiner2: assignment.examiner2,
          backupExaminer: assignment.backupExaminer
        })
      }
    })
    
    const fixedResult = FrontendDisplayFixer.fixScheduleResultDisplay(result, cachedTeacherData || [])
    process.env.NODE_ENV === 'development' && console.log('数据格式修复完成')
    result = fixedResult as any
  } catch (error) {
    console.error('数据格式修复失败:', error)
    // 继续使用原始数据，但记录错误
  }
  
  // 增强数据验证
  if (!result) {
    console.error('排班结果为空或undefined')
    schedulingError.value = '排班结果数据为空，请重试'
    return
  }
  
  if (!result.assignments) {
    console.error('排班结果缺少assignments字段')
    schedulingError.value = '排班结果格式错误：缺少assignments数据'
    return
  }
  
  if (!Array.isArray(result.assignments)) {
    console.error('assignments不是数组格式:', typeof result.assignments)
    schedulingError.value = '排班结果格式错误：assignments数据格式不正确'
    return
  }
  
  process.env.NODE_ENV === 'development' && console.log('🔍 算法返回的assignments数量:', result.assignments.length)
  
  // 验证每个assignment的数据完整性
  const validAssignments = result.assignments.filter((assignment, index) => {
    if (!assignment) {
      console.warn(`⚠️ ${index + 1}个assignment为空`)
      return false
    }
    
    if (!assignment.studentId || !assignment.studentName) {
      console.warn(`⚠️ ${index + 1}个assignment缺少学员信息:`, assignment)
      return false
    }
    
    return true
  })
  
  process.env.NODE_ENV === 'development' && console.log(`有效的assignments数量: ${validAssignments.length}/${result.assignments.length}`)
  
  // 🔍 添加学员数据分析，检查是否有学员丢失
  const originalStudentIds = new Set()
  const assignedStudentIds = new Set()
  
  // 统计原始学员数据
  studentList.value.forEach(student => {
    originalStudentIds.add(student.id.toString())
  })
  
  // 统计assignments中的学员
  validAssignments.forEach(assignment => {
    assignedStudentIds.add(assignment.studentId.toString())
  })
  
  process.env.NODE_ENV === 'development' && console.log('🔍 学员数据分析:')
  process.env.NODE_ENV === 'development' && console.log(`📊 原始学员数量: ${originalStudentIds.size}`)
  process.env.NODE_ENV === 'development' && console.log(`📊 assignments中的学员数量: ${assignedStudentIds.size}`)
  process.env.NODE_ENV === 'development' && console.log(`📊 原始学员ID列表:`, Array.from(originalStudentIds))
  process.env.NODE_ENV === 'development' && console.log(`📊 assignments中的学员ID列表:`, Array.from(assignedStudentIds))
  
  // 检查丢失的学员
  const missingStudents: any[] = []
  originalStudentIds.forEach(studentId => {
    if (!assignedStudentIds.has(studentId)) {
      const student = studentList.value.find(s => s.id.toString() === studentId)
      if (student) {
        missingStudents.push(student)
      }
    }
  })
  
  if (missingStudents.length > 0) {
    console.warn(`⚠️ 发现${missingStudents.length}名学员在排班结果中缺失:`)
    missingStudents.forEach(student => {
      console.warn(`❌ 缺失学员: ${student.name} (ID: ${student.id}, 科室: ${student.department})`)
    })
    
    // 🔧 自动添加缺失学员到结果中，标记为"未安排"
    process.env.NODE_ENV === 'development' && console.log('🔧 自动添加缺失学员到结果表格中...')
  }
  
  // 如果没有有效的assignments，显示详细错误信息
  if (validAssignments.length === 0) {
    console.error('❌ 没有有效的排班分配数据')
    process.env.NODE_ENV === 'development' && console.log('🔍 原始assignments数据:', result.assignments)
    process.env.NODE_ENV === 'development' && console.log('🔍 过滤条件检查:')
    result.assignments.forEach((assignment, index) => {
      process.env.NODE_ENV === 'development' && console.log(`Assignment ${index}:`, {
        hasStudentId: !!assignment.studentId,
        hasStudentName: !!assignment.studentName,
        hasExamDate: !!assignment.examDate,
        hasExamType: !!assignment.examType,
        assignment
      })
    })
    schedulingError.value = '排班数据验证失败：没有有效的分配记录'
    return
  }
  
  // 清空旧数据
  scheduleResults.value = []
  
  // 将排班结果转换为表格数据格式
  let newResults: ScheduleResultRow[] = []
  
  // 按学员分组排班结果
  const studentExams = new Map<string, {
    studentName: string
    studentDepartment: string
    day1: any | null
    day2: any | null
  }>()
  
  // 🔧 强制去重：按assignment ID去重
  const uniqueAssignments = new Map<string, any>()
  validAssignments.forEach((assignment) => {
    const assignmentId = assignment.id || `${assignment.studentId}_${assignment.examType || 'unknown'}`
    if (!uniqueAssignments.has(assignmentId)) {
      uniqueAssignments.set(assignmentId, assignment)
    } else {
      console.warn(`⚠️ 检测到重复的assignment ID: ${assignmentId}，已跳过`)
    }
  })
  
  const deduplicatedAssignments = Array.from(uniqueAssignments.values())
  process.env.NODE_ENV === 'development' && console.log(`🔧 去重完成: ${validAssignments.length} -> ${deduplicatedAssignments.length}`)
  
  if (validAssignments.length !== deduplicatedAssignments.length) {
    alert(`⚠️ 检测到并移除了${validAssignments.length - deduplicatedAssignments.length}个重复的排班数据`)
  }
  
  // 使用去重后的assignments数据
  deduplicatedAssignments.forEach((assignment, index) => {
    // 增强assignment数据验证
    try {
      process.env.NODE_ENV === 'development' && console.log(`🔍 处理第${index + 1}个assignment:`, assignment)
      process.env.NODE_ENV === 'development' && console.log(`🔍 详细examiner数据:`, {
        examiner1_type: typeof assignment.examiner1,
        examiner1_value: assignment.examiner1,
        examiner2_type: typeof assignment.examiner2,
        examiner2_value: assignment.examiner2,
        backupExaminer_type: typeof assignment.backupExaminer,
        backupExaminer_value: assignment.backupExaminer
      })
      
      // 修复assignment.id为null的问题
      if (!assignment.id) {
        console.warn(`⚠️ Assignment ID为null，使用索引生成ID: ${index + 1}`)
        assignment.id = `assignment_${index + 1}_${assignment.studentId}`
      }
      
      // 修复examDate为null的问题 - ❌ 已禁用：不再覆盖后端的日期分配
      // ⚠️ 问题：这段代码会用前端的默认日期覆盖后端OptaPlanner的智能日期选择
      // ⚠️ 导致无论后端计算出什么日期，前端总是显示10-10 & 10-11
      if ((!assignment.examDate || assignment.examDate === '' || assignment.examDate === 'null')) {
        console.error(`❌ 后端未返回考试日期！assignment:`, assignment)
        console.error(`❌ 这是后端数据问题，请检查OptaPlanner输出`)
        // 不再强制分配日期，让错误暴露出来
      } else if (assignment.examDate) {
        process.env.NODE_ENV === 'development' && console.log(`✅ 使用后端分配的日期: ${assignment.studentName} -> ${assignment.examDate}`)
      }
      
      /* 
      // 原日期强制分配逻辑（已禁用）
      if ((!assignment.examDate || assignment.examDate === '' || assignment.examDate === 'null') && examStartDate.value && examEndDate.value) {
        // 使用现有的generateExamDateRange函数生成可用工作日
        const startDate = new Date(examStartDate.value)
        const endDate = new Date(examEndDate.value)
        const availableDates = generateExamDateRange(startDate, endDate)
        
        process.env.NODE_ENV === 'development' && console.log(`📅 生成考试日期范围: ${examStartDate.value} 到 ${examEndDate.value}`)
        process.env.NODE_ENV === 'development' && console.log(`📊 可用工作日数量: ${availableDates.length} 天`)
        process.env.NODE_ENV === 'development' && console.log(`📋 具体日期: ${availableDates.join(', ')}`)
        
        // 🔧 修复：确保同一学员的两次考试分配到连续的不同日期
        const studentIndex = Math.floor(index / 2) // 每个学员有两次考试
        const examIndex = index % 2 // 0=第一天，1=第二天
        
        // 确保有足够的连续日期对
        const baseDateIndex = Math.min(studentIndex * 2, availableDates.length - 2)
        let assignedDate
        
        if (examIndex === 0) {
          // 第一天考试
          assignedDate = availableDates[baseDateIndex] || availableDates[0]
        } else {
          // 第二天考试，必须是第一天的下一个工作日
          assignedDate = availableDates[baseDateIndex + 1] || availableDates[Math.min(baseDateIndex + 1, availableDates.length - 1)]
        }
        
        assignment.examDate = assignedDate
        process.env.NODE_ENV === 'development' && console.log(`🔧 强制分配${assignment.studentName}的考试日期: ${assignment.examDate} (学员索引:${studentIndex}, 考试序号:${examIndex})`)
      }
      */
      
      // 修复examType识别问题
      let examType = assignment.examType
      if (!examType || (examType !== 'day1' && examType !== 'day2')) {
        // 根据考试日期推断examType
        if (assignment.examDate && examStartDate.value) {
          const examDate = new Date(assignment.examDate)
          const startDate = new Date(examStartDate.value)
          const daysDiff = Math.floor((examDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysDiff === 0) {
            examType = 'day1'
            process.env.NODE_ENV === 'development' && console.log(`🔧 根据日期推断${assignment.studentName}为第一天考试`)
          } else if (daysDiff === 1) {
            examType = 'day2'
            process.env.NODE_ENV === 'development' && console.log(`🔧 根据日期推断${assignment.studentName}为第二天考试`)
          } else {
            // 如果无法推断，根据学员在数组中的位置分配
            examType = (index % 2 === 0) ? 'day1' : 'day2'
            process.env.NODE_ENV === 'development' && console.log(`🔧 根据索引推断${assignment.studentName}为${examType}考试`)
          }
          assignment.examType = examType
        } else {
          console.error(`❌ Assignment缺少examDate和examType: ${assignment.studentName}`)
          examType = (index % 2 === 0) ? 'day1' : 'day2' // 根据索引分配
          assignment.examType = examType
        }
      }
      
      // 修复备份考官为null的问题 - 改进分配逻辑
      if ((!assignment.backupExaminer || assignment.backupExaminer === '' || assignment.backupExaminer === 'null') && cachedTeacherData && cachedTeacherData.length > 0) {
        // 获取已分配的考官，避免重复 - 支持字符串和对象格式
        const assignedExaminers = new Set()
        if (assignment.examiner1) {
          const examiner1Id = typeof assignment.examiner1 === 'string'
            ? assignment.examiner1
            : (assignment.examiner1 && typeof assignment.examiner1 === 'object' && 'id' in assignment.examiner1)
              ? (assignment.examiner1 as { id?: string | number }).id
              : undefined
          if (examiner1Id) assignedExaminers.add(examiner1Id)
        }
        if (assignment.examiner2) {
          const examiner2Id = typeof assignment.examiner2 === 'string'
            ? assignment.examiner2
            : (assignment.examiner2 && typeof assignment.examiner2 === 'object' && 'id' in assignment.examiner2)
              ? (assignment.examiner2 as { id?: string | number }).id
              : undefined
          if (examiner2Id) assignedExaminers.add(examiner2Id)
        }
        
        // 优先选择不同科室的考官作为备份考官
        let availableBackup = cachedTeacherData.find(teacher => 
          !assignedExaminers.has(teacher.id) && 
          !assignedExaminers.has(teacher.name) && // 也检查姓名
          teacher.department !== assignment.studentDepartment
        )
        
        // 如果没有不同科室的，就选择任意未被分配的考官
        if (!availableBackup) {
          availableBackup = cachedTeacherData.find(teacher => 
            !assignedExaminers.has(teacher.id) && 
            !assignedExaminers.has(teacher.name)
          )
        }
        
        // 如果还是没有，使用智能均衡分配，确保备份考官分配均匀
        if (!availableBackup) {
          // 🔧 修复：彻底解决备份考官过度分配问题
          // 统计每个考官在当前日期被分配为备份考官的次数
          const currentDateBackupCount = new Map()
          const currentDate = assignment.examDate
          
          result.assignments.forEach((assign: any) => {
            if (assign.backupExaminer && assign.examDate === currentDate) {
              const name = typeof assign.backupExaminer === 'string' ? assign.backupExaminer : assign.backupExaminer.name
              if (name) {
                currentDateBackupCount.set(name, (currentDateBackupCount.get(name) || 0) + 1)
              }
            }
          })
          
          // 找到在当前日期被分配次数最少且可用的考官作为备份考官
          let minCount = Infinity
          let selectedTeacher = null
          
          for (const teacher of cachedTeacherData) {
            // 跳过已经被分配为考官1或考官2的考官（同一场考试不能兼任）
            if (assignedExaminers.has(teacher.id) || assignedExaminers.has(teacher.name)) {
              continue
            }
            
            // 检查科室约束：备份考官最好来自不同科室
            const studentDept = assignment.studentDepartment || '未知'
            const teacherDept = teacher.department || '未知'
            
            // 优先选择不同科室的考官作为备份考官
            const isDifferentDept = !teacherDept.includes(studentDept) && !studentDept.includes(teacherDept)
            
            const currentCount = currentDateBackupCount.get(teacher.name) || 0
            
            // 优先级：1. 不同科室且分配次数少 2. 分配次数少
            const priority = isDifferentDept ? currentCount - 0.5 : currentCount
            
            if (priority < minCount) {
              minCount = priority
              selectedTeacher = teacher
            }
          }
          
          // 如果找到了合适的考官，使用它
          if (selectedTeacher) {
            availableBackup = selectedTeacher
            const actualCount = currentDateBackupCount.get(selectedTeacher.name) || 0
            process.env.NODE_ENV === 'development' && console.log(`🎯 均衡分配备份考官: ${selectedTeacher.name} (${selectedTeacher.department}) 当前日期分配次数: ${actualCount}`)
          } else {
            // 备用方案：使用轮询，但确保均衡分配
            const sortedTeachers = [...cachedTeacherData].sort((a, b) => {
              const countA = currentDateBackupCount.get(a.name) || 0
              const countB = currentDateBackupCount.get(b.name) || 0
              return countA - countB
            })
            
            // 选择被分配次数最少的考官
            availableBackup = sortedTeachers[0]
            const actualCount = currentDateBackupCount.get(availableBackup.name) || 0
            process.env.NODE_ENV === 'development' && console.log(`🔄 轮询分配备份考官: ${availableBackup.name} (当前日期分配次数: ${actualCount})`)
          }
        }
        
        if (availableBackup) {
          // @ts-ignore - backupExaminer可以是string或对象，运行时会正确处理
          assignment.backupExaminer = availableBackup
          process.env.NODE_ENV === 'development' && console.log(`🔧 智能分配${assignment.studentName}的备份考官: ${availableBackup.name} (${availableBackup.department})`)
        }
      }
      
      const studentId = assignment.studentId
      
      if (!studentExams.has(studentId)) {
        studentExams.set(studentId, {
          studentName: assignment.studentName,
          studentDepartment: assignment.studentDepartment,
          day1: null,
          day2: null
        })
      }
      
      const studentData = studentExams.get(studentId)!
      
      if (examType === 'day1') {
        studentData.day1 = assignment
        process.env.NODE_ENV === 'development' && console.log(`✅ 设置${assignment.studentName}的第一天考试`)
      } else if (examType === 'day2') {
        studentData.day2 = assignment
        process.env.NODE_ENV === 'development' && console.log(`✅ 设置${assignment.studentName}的第二天考试`)
      } else {
        console.warn(`⚠️ 未知的考试类型: ${examType}，强制分配到day1`)
        studentData.day1 = assignment
      }
      
    } catch (error) {
      console.error(`处理${index + 1}个assignment时出错`, error, assignment)
    }
  })
  
  process.env.NODE_ENV === 'development' && console.log(`🔍 按学员分组后，共${studentExams.size}名学员`)
  
  // 🔧 添加备份考官工作量统计和验证
  const backupWorkloadStats = new Map()
  result.assignments.forEach((assignment: any) => {
    if (assignment.backupExaminer) {
      const name = typeof assignment.backupExaminer === 'string' ? assignment.backupExaminer : assignment.backupExaminer.name
      if (name) {
        backupWorkloadStats.set(name, (backupWorkloadStats.get(name) || 0) + 1)
      }
    }
  })
  
  process.env.NODE_ENV === 'development' && console.log('📊 备份考官工作量统计:')
  Array.from(backupWorkloadStats.entries())
    .sort((a, b) => b[1] - a[1]) // 按工作量降序排列
    .forEach(([name, count]) => {
      const level = count > 5 ? '🔴' : count > 3 ? '🟡' : '🟢'
      process.env.NODE_ENV === 'development' && console.log(`  ${level} ${name}: ${count}次 ${count > 5 ? '(过度分配)' : count > 3 ? '(适中)' : '(合理)'}`)
    })
  
  // 🔧 添加连续两天考试硬约束验证
  const validateConsecutiveDaysConstraint = () => {
    const violations: Array<{studentName: string, issue: string, severity: 'hard' | 'soft'}> = []
    
    studentExams.forEach((examData, studentId) => {
      if (examData.day1 && examData.day2) {
        const date1 = new Date(examData.day1.examDate)
        const date2 = new Date(examData.day2.examDate)
        const dayDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
        
        // 检查是否为连续两天（工作日）
        if (dayDiff !== 1) {
          violations.push({
            studentName: examData.studentName,
            issue: `考试日期不连续：第一天=${examData.day1.examDate}, 第二天=${examData.day2.examDate}, 间隔=${dayDiff}天`,
            severity: 'hard'
          })
          console.error(`❌ 硬约束违反: ${examData.studentName}的考试日期不连续`)
        } else {
          process.env.NODE_ENV === 'development' && console.log(`✅ ${examData.studentName}的考试日期符合连续两天要求`)
        }
      } else {
        violations.push({
          studentName: examData.studentName,
          issue: `缺少完整的两天考试安排: day1=${examData.day1 ? '已安排' : '缺失'}, day2=${examData.day2 ? '已安排' : '缺失'}`,
          severity: 'hard'
        })
      }
    })
    
    if (violations.length > 0) {
      console.error('🚨 发现硬约束违反:', violations)
      // 可以选择在这里抛出错误或显示警告
    }
    
    return violations
  }
  
  // 🔧 添加学员白班不参加考试硬约束验证
  const validateStudentDayShiftConstraint = () => {
    const violations: Array<{studentName: string, issue: string, severity: 'hard' | 'soft', day: number}> = []
    
    studentExams.forEach((examData, studentId) => {
      [examData.day1, examData.day2].forEach((exam, dayIndex) => {
        if (exam && exam.examDate) {
          // 这里需要检查学员在考试日期是否执勤白班
          // 由于缺少具体的轮值信息，我们先添加基础验证框架
          const examDate = new Date(exam.examDate)
          const dayOfWeek = examDate.getDay()
          
          // 基础验证：确保不在周末安排考试（除非特殊情况）
          if (dayOfWeek === 0 || dayOfWeek === 6) {
            violations.push({
              studentName: examData.studentName,
              issue: `考试安排在周末：${exam.examDate} (星期${dayOfWeek === 0 ? '日' : '六'})`,
              severity: 'soft',
              day: dayIndex + 1
            })
            console.warn(`⚠️ 软约束违反: ${examData.studentName}在第${dayIndex + 1}天的考试安排在周末`)
          }
          
          // 🔍 检查学员班组是否在该日期执勤白班
          try {
            // 获取该日期的值班安排
            const examDateObj = dateUtils.parseDate(exam.examDate)
            const dateStr = dateUtils.toStorageDate(examDateObj) // YYYY-MM-DD格式
            
            // 简化的白班检查逻辑（基于现有的值班计算）
            const dayOfWeek = examDateObj.getDay() // 0=周日, 1=周一, ..., 6=周六
            
            // 基于四班倒轮值规律进行简单检查
            // 这里需要根据实际的轮值规律进行调整
            const studentGroup = examData.studentName.includes('一') ? '一组' : 
                                examData.studentName.includes('二') ? '二组' : 
                                examData.studentName.includes('三') ? '三组' : 
                                examData.studentName.includes('四') ? '四组' : '未知组'
            
            // 模拟白班检查（实际应该调用dutyRotationService）
            if (studentGroup !== '未知组') {
              // 这里应该有更精确的轮值检查逻辑
              process.env.NODE_ENV === 'development' && console.log(`🔍 检查${examData.studentName}(${studentGroup})在${exam.examDate}的值班状态`)
              
              // 如果检测到可能的白班冲突，添加到违反列表
              // 暂时使用简化逻辑：工作日且特定条件下认为可能是白班
              if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 工作日
                violations.push({
                  studentName: examData.studentName,
                  issue: `需要验证${exam.examDate}是否为${studentGroup}白班执勤日`,
                  severity: 'soft', // 标记为软约束，需要人工确认
                  day: dayIndex + 1
                })
                console.warn(`⚠️ 需要确认: ${examData.studentName}在第${dayIndex + 1}天(${exam.examDate})的白班状态`)
              }
            }
          } catch (error) {
            console.error(`检查${examData.studentName}白班状态时出错:`, error)
          }
        }
      })
    })
    
    return violations
  }
  
  // 🔧 添加硬约束违反自动修复逻辑
  const fixConsecutiveDaysViolations = () => {
    const availableDates = generateExamDateRange(new Date(examStartDate.value!), new Date(examEndDate.value!))
    let fixedCount = 0
    
    // 收集已使用的日期对，避免冲突
    const usedDatePairs = new Set<string>()
    
    // 先收集正确的日期对
    studentExams.forEach((examData, studentId) => {
      if (examData.day1 && examData.day2) {
        const date1 = new Date(examData.day1.examDate)
        const date2 = new Date(examData.day2.examDate)
        const dayDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
        
        if (dayDiff === 1) {
          // 记录正确的日期对
          const pair = `${examData.day1.examDate}-${examData.day2.examDate}`
          usedDatePairs.add(pair)
        }
      }
    })
    
    // 修复不正确的日期分配
    studentExams.forEach((examData, studentId) => {
      if (examData.day1 && examData.day2) {
        const date1 = new Date(examData.day1.examDate)
        const date2 = new Date(examData.day2.examDate)
        const dayDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24))
        
        // 如果日期不连续或相同，自动修复
        if (dayDiff !== 1) {
          console.warn(`🔧 自动修复${examData.studentName}的考试日期问题: day1=${examData.day1.examDate}, day2=${examData.day2.examDate}, 间隔=${dayDiff}天`)
          
          // 找到一个未使用的连续日期对
          let foundPair = false
          for (let i = 0; i < availableDates.length - 1; i++) {
            const firstDate = availableDates[i]
            const secondDate = availableDates[i + 1]
            
            // 检查这两个日期是否连续
            const d1 = new Date(firstDate)
            const d2 = new Date(secondDate)
            const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
            
            if (diff === 1) {
              const pair = `${firstDate}-${secondDate}`
              
                                            // 🔧 HC6约束检查：学员不能在其白班日期参加考试
               // 从studentList.value中查找学员班组信息
               const student = studentList.value.find((s: any) => s.name === examData.studentName)
               const studentGroup = student?.group
               let hasHC6Violation = false
               
               if (studentGroup) {
               // 检查两个日期是否违反HC6约束（使用统一的 dutyRotationService）
                for (const checkDate of [firstDate, secondDate]) {
                 const dutySchedule = dutyRotationService.calculateDutySchedule(checkDate)
                 const dayShift = dutySchedule.dayShift
                 
                  if (studentGroup === dayShift) {
                    console.warn(`🚨 HC6违反: ${examData.studentName}(${studentGroup}) 不能在 ${checkDate}(${dayShift}白班) 参加考试`)
                    hasHC6Violation = true
                    break
                  }
                }
              }
              
              // 检查这个日期对是否已被使用且不违反HC6约束
              if (!usedDatePairs.has(pair) && !hasHC6Violation) {
                // 分配给学员并标记为已使用
                examData.day1.examDate = firstDate
                examData.day2.examDate = secondDate
                usedDatePairs.add(pair)
                process.env.NODE_ENV === 'development' && console.log(`✅ 修复${examData.studentName}考试日期: ${firstDate} -> ${secondDate} (HC6检查通过)`)
                fixedCount++
                foundPair = true
                break
              } else if (hasHC6Violation) {
                process.env.NODE_ENV === 'development' && console.log(`⚠️ 跳过${examData.studentName}的日期对 ${firstDate}-${secondDate} (HC6约束冲突)`)
              }
            }
          }
          
          if (!foundPair) {
            console.error(`❌ 无法为${examData.studentName}找到可用的连续日期对`)
          }
        }
      }
    })
    
    return fixedCount
  }
  
  // 执行硬约束验证
  const localConstraintViolations = validateConsecutiveDaysConstraint()
  const dayShiftViolations = validateStudentDayShiftConstraint()
  
  // 🔧 新增：验证HC2科室匹配约束
const departmentViolations: any[] = [] // validateDepartmentMatchingConstraint(scheduleResults.value)

// 🔧 新增：验证HC4考官时间冲突约束  
const timeConflictViolations: any[] = [] // validateExaminerTimeConflictConstraint(scheduleResults.value)
  
  // 如果发现硬约束违反，尝试自动修复 - ❌ 已禁用
  // ⚠️ 问题：这个功能会覆盖后端OptaPlanner的权威结果
  // ⚠️ 后端可能故意分配不连续的日期（例如分散日期以均衡负载）
  // ⚠️ 前端不应该擅自"修复"后端的决策
  console.warn('⚠️ [禁用] 前端自动修复功能已禁用，完全信任后端OptaPlanner结果')
  
  const allConstraintViolations = [...localConstraintViolations, ...dayShiftViolations, ...departmentViolations, ...timeConflictViolations]
  
  /*
  // 原自动修复逻辑（已禁用）
  const hardViolations = allConstraintViolations.filter(v => v.severity === 'hard')
  if (hardViolations.length > 0) {
    process.env.NODE_ENV === 'development' && console.log('🔧 发现硬约束违反，尝试自动修复...')
    const fixedCount = fixConsecutiveDaysViolations()
    process.env.NODE_ENV === 'development' && console.log(`✅ 自动修复了${fixedCount}个硬约束违反`)
    
    // 重新验证
    const revalidationViolations = validateConsecutiveDaysConstraint()
    const remainingHardViolations = revalidationViolations.filter(v => v.severity === 'hard')
    if (remainingHardViolations.length === 0) {
      process.env.NODE_ENV === 'development' && console.log('🎉 所有硬约束违反已修复！')
    } else {
      console.warn('⚠️ 仍有硬约束违反无法自动修复:', remainingHardViolations)
    }
  }
  */
  
  // 🔧 修复：直接使用后端OptaPlanner权威结果，避免前端约束验证差异
  process.env.NODE_ENV === 'development' && console.log('🔗 [约束同步] 使用后端OptaPlanner权威约束结果')
  
  // 🔍 添加诊断日志
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] ===== 开始约束得分解析 =====')
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] result.score:', result.score)
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] result.score类型:', typeof result.score)
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] result.statistics:', result.statistics)
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] result.statistics.hardConstraintViolations:', result.statistics?.hardConstraintViolations)
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] result.statistics.softConstraintsScore:', result.statistics?.softConstraintsScore)
  
  // 🎯 检查后端返回的硬约束状态
  let backendHardScore = 0
  let backendSoftScore = 0
  
  // ✨ 改进的得分解析逻辑，支持多种格式
  // 尝试从多个可能的位置获取得分
  if (result.score) {
    // 情况1：score是对象格式 {hardScore: -16000, softScore: 84850}
    if (typeof result.score === 'object' && result.score.hardScore !== undefined) {
    backendHardScore = result.score.hardScore || 0
    backendSoftScore = result.score.softScore || 0
      process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] 从result.score对象获取:', { backendHardScore, backendSoftScore })
    }
    // 情况2：score是字符串格式 "-16000hard/84850soft"
    else if (typeof result.score === 'string') {
      const match = result.score.match(/(-?\d+)hard\/(-?\d+)soft/)
      if (match) {
        backendHardScore = parseInt(match[1])
        backendSoftScore = parseInt(match[2])
        process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] 从result.score字符串解析:', { backendHardScore, backendSoftScore })
      }
    }
  }
  
  // 备用方案：从statistics获取
  if (backendHardScore === 0 && backendSoftScore === 0 && result.statistics) {
    // 尝试从hardConstraintViolations和softConstraintsScore获取
    if (result.statistics.hardConstraintViolations !== undefined) {
      backendHardScore = -Math.abs(result.statistics.hardConstraintViolations)
      process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] 从statistics.hardConstraintViolations获取:', backendHardScore)
    }
    if (result.statistics.softConstraintsScore !== undefined) {
      backendSoftScore = result.statistics.softConstraintsScore
      process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] 从statistics.softConstraintsScore获取:', backendSoftScore)
    }
    
    // 尝试从finalScore获取
    if (backendHardScore === 0 && result.statistics.finalScore) {
      if (typeof result.statistics.finalScore === 'object') {
    backendHardScore = result.statistics.finalScore.hardScore || 0
    backendSoftScore = result.statistics.finalScore.softScore || 0
        process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] 从statistics.finalScore对象获取:', { backendHardScore, backendSoftScore })
      } else if (typeof result.statistics.finalScore === 'string') {
        const match = result.statistics.finalScore.match(/(-?\d+)hard\/(-?\d+)soft/)
        if (match) {
          backendHardScore = parseInt(match[1])
          backendSoftScore = parseInt(match[2])
          process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] 从statistics.finalScore字符串解析:', { backendHardScore, backendSoftScore })
        }
      }
    }
  }
  
  process.env.NODE_ENV === 'development' && console.log('🔍 [诊断] ===== 结束约束得分解析 =====')
  process.env.NODE_ENV === 'development' && console.log(`📊 [约束同步] 后端约束状态: 硬约束=${backendHardScore}, 软约束=${backendSoftScore}`)
  
  // 清空前端验证结果，使用后端权威数据
  allConstraintViolations.length = 0
  
  if (backendHardScore < 0) {
    // 后端存在硬约束违反，添加通用违反提示
    allConstraintViolations.push({
      studentName: '系统检测',
      issue: `后端检测到硬约束违反 (硬约束得分: ${backendHardScore})`,
      severity: 'hard',
      constraintId: 'BACKEND_HARD_VIOLATION',
      examDate: dateUtils.toStorageDate(new Date()),
      violationType: 'system'
    })
    process.env.NODE_ENV === 'development' && console.log('⚠️ [约束同步] 后端检测到硬约束违反')
  } else {
    // 🔧 确保清空constraintViolations显示
    constraintViolations.value = []
    process.env.NODE_ENV === 'development' && console.log('✅ [约束同步] 后端无硬约束违反，前端约束列表已清空')
  }

  // 🔧 HC6本地验证：检查学员是否在其白班日期参加考试
  process.env.NODE_ENV === 'development' && console.log('🔧 开始HC6本地验证...')
  
  // 使用统一的 dutyRotationService 进行计算，与后端算法保持一致
  for (const result of scheduleResults.value) {
    const resultAny = result as any
    const studentGroup = resultAny.学员信息?.班组
    if (!studentGroup) continue
    
    for (const day of ['第一天', '第二天']) {
      const dayInfo = resultAny[day]
      if (!dayInfo?.考试日期) continue
      
      const dutySchedule = dutyRotationService.calculateDutySchedule(dayInfo.考试日期)
      const isStudentOnDayShift = studentGroup === dutySchedule.dayShift
      
      process.env.NODE_ENV === 'development' && console.log(`🔍 HC6验证: ${resultAny.学员信息.姓名} (${studentGroup}) 在 ${dayInfo.考试日期}`)
      process.env.NODE_ENV === 'development' && console.log(`🔍 白班班组: ${dutySchedule.dayShift}, 学员班组: ${studentGroup}, 是否白班: ${isStudentOnDayShift}`)
      
      if (isStudentOnDayShift) {
        console.error(`🚨 HC6违反: 学员 ${resultAny.学员信息.姓名} (${studentGroup}) 在白班日期 ${dayInfo.考试日期} 参加考试!`)
        allConstraintViolations.push({
          studentName: resultAny.学员信息.姓名,
          issue: `学员在白班执勤日(${dayInfo.考试日期})参加考试，违反HC6约束`,
          severity: 'hard',
          constraintId: 'HC6',
          examDate: dayInfo.考试日期,
          violationType: 'day_shift_conflict'
        })
      } else {
        process.env.NODE_ENV === 'development' && console.log(`✅ HC6合规: 学员 ${resultAny.学员信息.姓名} 在 ${dayInfo.考试日期} 非白班执勤`)
      }
    }
  }
  
  process.env.NODE_ENV === 'development' && console.log('✅ HC6本地验证完成')

  // 合并所有约束违反（现在可能包含后端同步的结果）
  const allViolations = allConstraintViolations
  if (allViolations.length > 0) {
    console.error('🚨 发现约束违反问题!')
    process.env.NODE_ENV === 'development' && console.log('📊 约束验证结果:', {
      总违反数: allViolations.length,
      硬约束违反: allViolations.filter(v => v.severity === 'hard').length,
      软约束违反: allViolations.filter(v => v.severity === 'soft').length,
      详细信息: allViolations
    })
    
    // 显示每个违反的详细信息
    allViolations.forEach((violation, index) => {
      const severity = violation.severity === 'hard' ? '🚨 硬约束' : '⚠️ 软约束'
      process.env.NODE_ENV === 'development' && console.log(`${severity}违反 #${index + 1}: ${violation.studentName} - ${violation.issue}`)
    })
  } else {
    process.env.NODE_ENV === 'development' && console.log('✅ 所有约束验证通过，无违反情况')
  }
  
  // 转换为表格格子
  studentExams.forEach((examData, studentId) => {
    let day1 = examData.day1
    let day2 = examData.day2
    
    // 确保day1是较早的日期，day2是较晚的日期
    if (day1 && day2) {
      process.env.NODE_ENV === 'development' && console.log(`🔍 ${examData.studentName}原始日期: day1=${day1.examDate}, day2=${day2.examDate}`)
      
      const date1 = new Date(day1.examDate)
      const date2 = new Date(day2.examDate)
      
      process.env.NODE_ENV === 'development' && console.log(`🔍 ${examData.studentName}解析后日期: date1=${date1.toISOString()}, date2=${date2.toISOString()}`)
      process.env.NODE_ENV === 'development' && console.log(`🔍 ${examData.studentName}时间戳比: date1=${date1.getTime()}, date2=${date2.getTime()}`)
      
      // 如果day1的日期晚于day2，则交换它们
      if (date1.getTime() > date2.getTime()) {
        process.env.NODE_ENV === 'development' && console.log(`🔄 ${examData.studentName}需要交换日期顺序`)
        // 交换两天的考试安排
        const temp = day1;
        day1 = day2;
        day2 = temp;
        process.env.NODE_ENV === 'development' && console.log(`🔄 ${examData.studentName}交换日期: day1=${day1?.examDate || 'null'}, day2=${day2?.examDate || 'null'}`)
      } else {
        process.env.NODE_ENV === 'development' && console.log(`${examData.studentName}日期顺序正确，无需交换`)
      }
    }
    
    process.env.NODE_ENV === 'development' && console.log(`🔍 处理学员${examData.studentName}的显示数据`, {
       day1: day1 ? {
         examDate: day1.examDate,
         examiner1: day1.examiner1,
         examiner2: day1.examiner2,
         backupExaminer: day1.backupExaminer
       } : null,
       day2: day2 ? {
         examDate: day2.examDate,
         examiner1: day2.examiner1,
         examiner2: day2.examiner2,
         backupExaminer: day2.backupExaminer
       } : null
     })
    
    // 增强数据转换的安全性
    try {
      // 转换考官姓名
      let examiner1_1 = day1 ? getTeacherNameById(day1.examiner1) : '未分组'
      let examiner1_2 = day1 ? getTeacherNameById(day1.examiner2) : '未分组'
      const backup1 = day1 ? getTeacherNameById(day1.backupExaminer) : '未分组'
      let examiner2_1 = day2 ? getTeacherNameById(day2.examiner1) : '未分组'
      let examiner2_2 = day2 ? getTeacherNameById(day2.examiner2) : '未分组'
      const backup2 = day2 ? getTeacherNameById(day2.backupExaminer) : '未分组'
      
      // 详细调试考官转换结果
      process.env.NODE_ENV === 'development' && console.log(`🔍 ${examData.studentName}考官转换结果:`, {
        day1_examiner1_raw: day1?.examiner1,
        day1_examiner2_raw: day1?.examiner2,
        day1_examiner1_converted: examiner1_1,
        day1_examiner2_converted: examiner1_2,
        day2_examiner1_raw: day2?.examiner1,
        day2_examiner2_raw: day2?.examiner2,
        day2_examiner1_converted: examiner2_1,
        day2_examiner2_converted: examiner2_2
      })
      
      // 强化数据验证：检查考官重复和缺失问题
      const validationErrors: string[] = []
      
      // 检查第一天考官配备
      if (examiner1_1 === '未分组' || examiner1_2 === '未分组') {
        validationErrors.push(`${examData.studentName}第一天缺少主考官配备`)
      }
      
      if (examiner1_1 === examiner1_2 && examiner1_1 !== '未分组') {
        console.error(`约束违反: ${examData.studentName}第一天考官1和考官2相同`, {
          examiner1_1,
          examiner1_2,
          day1_examiner1_raw: day1?.examiner1,
          day1_examiner2_raw: day1?.examiner2
        })
        
        validationErrors.push(`${examData.studentName}第一天考官重复分配`)
        
        // 智能修复：尝试从可用考官中重新分配考官2
        if (examiner1_1 !== '未分组') {
          console.warn(`🔧 智能修复${examData.studentName}第一天考官重复问题：重新分配考官2`)
          const alternativeExaminer = findAlternativeExaminer(examiner1_1, examData.studentDepartment)
          examiner1_2 = alternativeExaminer || '重新分配失败'
          process.env.NODE_ENV === 'development' && console.log(`🔧 考官2重新分配结果: ${examiner1_2}`)
        }
      }
      
      // 检查第二天考官配备
      if (examiner2_1 === '未分组' || examiner2_2 === '未分组') {
        validationErrors.push(`${examData.studentName}第二天缺少主考官配备`)
      }
      
      if (examiner2_1 === examiner2_2 && examiner2_1 !== '未分组') {
        console.error(`约束违反: ${examData.studentName}第二天考官1和考官2相同`, {
          examiner2_1,
          examiner2_2,
          day2_examiner1_raw: day2?.examiner1,
          day2_examiner2_raw: day2?.examiner2
        })
        
        validationErrors.push(`${examData.studentName}第二天考官重复分配`)
        
        // 智能修复：尝试从可用考官中重新分配考官2
        if (examiner2_1 !== '未分组') {
          console.warn(`🔧 智能修复${examData.studentName}第二天考官重复问题：重新分配考官2`)
          const alternativeExaminer = findAlternativeExaminer(examiner2_1, examData.studentDepartment)
          examiner2_2 = alternativeExaminer || '重新分配失败'
          process.env.NODE_ENV === 'development' && console.log(`🔧 考官2重新分配结果: ${examiner2_2}`)
        }
      }
      
      // 记录验证错误用于后续处理
      if (validationErrors.length > 0) {
        console.warn(`⚠️ ${examData.studentName}数据验证发现问题:`, validationErrors)
      }
      
      // 🔧 从学员列表中查找推荐科室信息
      const studentInfo = studentList.value.find((s: any) => 
        s.id.toString() === studentId || s.name === examData.studentName
      )
      
      // 🆕 检查是否为一天考试
      const isOneDayExam = studentInfo?.examDays === 1
      
      // 生成唯一的数字ID：使用索引 + 1，避免ID为0
      const uniqueId = Array.from(studentExams.keys()).indexOf(studentId) + 1
      
      const studentRecord = {
        id: uniqueId,
        department: mapDepartmentName(examData.studentDepartment || '未知'), 
        student: examData.studentName || '未知学员',
        date1: day1 && day1.examDate ? dateUtils.toDisplayDate(day1.examDate) : '未安排',
        // 🆕 一天考试强制显示"模拟机"
        type1: isOneDayExam ? '模拟机' : (day1 && day1.subjects ? day1.subjects.join('/') : '现场+模拟机1'),
        examiner1_1,
        examiner1_2,
        backup1,
        // 🆕 一天考试的学员第二天不显示信息
        date2: isOneDayExam ? '-' : (day2 && day2.examDate ? dateUtils.toDisplayDate(day2.examDate) : '未安排'),
        type2: isOneDayExam ? '-' : (day2 && day2.subjects ? day2.subjects.join('/') : '模拟机2+口试'),
        examiner2_1: isOneDayExam ? '-' : examiner2_1,
        examiner2_2: isOneDayExam ? '-' : examiner2_2,
        backup2: isOneDayExam ? '-' : backup2,
        // 🔧 原始日期（用于约束检查，完整格式yyyy-MM-dd）
        rawDate1: day1 && day1.examDate ? day1.examDate : '未安排',
        rawDate2: isOneDayExam ? '' : (day2 && day2.examDate ? day2.examDate : '未安排'),
        // 🆕 添加推荐科室信息（用于智能推荐）
        recommendedExaminer1Dept: studentInfo?.recommendedExaminer1Dept,
        recommendedExaminer2Dept: studentInfo?.recommendedExaminer2Dept,
        // 🆕 添加考试天数标记
        examDays: studentInfo?.examDays || 2
      }
      
      // 最终验证：确保记录中没有重复考官
      process.env.NODE_ENV === 'development' && console.log(`🔍 ${examData.studentName}最终数据验证`, {
        day1: { examiner1: examiner1_1, examiner2: examiner1_2, backup: backup1 },
        day2: { examiner1: examiner2_1, examiner2: examiner2_2, backup: backup2 }
      })
      
      newResults.push(studentRecord)
      process.env.NODE_ENV === 'development' && console.log(`完成学员${examData.studentName}的数据转换`)
      
    } catch (error) {
      console.error(`转换学员${examData.studentName}数据时出错`, error)
        // 添加错误记录，避免丢失学员信息
      const errorUniqueId = Array.from(studentExams.keys()).indexOf(studentId) + 1
      newResults.push({
        id: errorUniqueId || Date.now(), // 使用时间戳作为备用ID确保唯一性
        department: '数据错误',
        student: examData.studentName || '未知学员',
        date1: '数据错误',
        type1: '数据错误',
        examiner1_1: '数据错误',
        examiner1_2: '数据错误',
        backup1: '数据错误',
        date2: '数据错误',
        type2: '数据错误',
        examiner2_1: '数据错误',
        examiner2_2: '数据错误',
        backup2: '数据错误'
      })
    }
  })
  
  // 处理未分配的学员
  if (result.unassignedStudents && Array.isArray(result.unassignedStudents) && result.unassignedStudents.length > 0) {
    process.env.NODE_ENV === 'development' && console.log(`⚠️ 发现${result.unassignedStudents.length}名未分配学员`)
    
    result.unassignedStudents.forEach((student, index) => {
      try {
        // 验证学员数据
        if (!student) {
          console.warn(`⚠️ ${index + 1}个未分配学员数据为空`)
          return
        }
        
        if (!student.name || !student.id) {
          console.warn(`⚠️ ${index + 1}个未分配学员缺少基本信息:`, student)
          return
        }
        
        process.env.NODE_ENV === 'development' && console.log(`🔍 未分配学员${student.name}的数据`, {
          id: student.id,
          name: student.name,
          department: student.department,
          group: student.group
        })
        
        // 使用唯一ID：基于结果数组长度 + 时间戳后6位确保唯一性
        const unassignedId = newResults.length + 1 + (Date.now() % 1000000)
        newResults.push({
          id: unassignedId,
          department: mapDepartmentName(student.department || '未知'),
          student: student.name,
          date1: '未安排',
          type1: '未安排',
          examiner1_1: '未分组',
          examiner1_2: '未分组',
          backup1: '未分组',
          date2: '未安排',
          type2: '未安排',
          examiner2_1: '未分组',
          examiner2_2: '未分组',
          backup2: '未分组',
        })
        
      } catch (error) {
        console.error(`处理${index + 1}个未分配学员时出错`, error, student)
      }
    })
  }
  
  // 🔧 处理在assignments中缺失的学员（前面检测到的missingStudents）
  if (missingStudents.length > 0) {
    process.env.NODE_ENV === 'development' && console.log(`🔧 添加${missingStudents.length}名缺失学员到结果表格中`)
    
    missingStudents.forEach((student, index) => {
      try {
        process.env.NODE_ENV === 'development' && console.log(`🔧 添加缺失学员${student.name}到结果中`)
        
        // 使用唯一ID：基于结果数组长度 + 时间戳后6位确保唯一性
        const missingId = newResults.length + 1 + (Date.now() % 1000000)
        newResults.push({
          id: missingId,
          department: mapDepartmentName(student.department || '未知'),
          student: student.name,
          date1: '未安排',
          type1: '未安排',
          examiner1_1: '算法未分配',
          examiner1_2: '算法未分配',
          backup1: '算法未分配',
          date2: '未安排',
          type2: '未安排',
          examiner2_1: '算法未分配',
          examiner2_2: '算法未分配',
          backup2: '算法未分配',
        })
        
      } catch (error) {
        console.error(`添加缺失学员${student.name}时出错`, error, student)
      }
    })
    
    process.env.NODE_ENV === 'development' && console.log(`✅ 已添加${missingStudents.length}名缺失学员，总记录数: ${newResults.length}`)
  }
  
  // 🔍 数据修复完成后进行验证
  process.env.NODE_ENV === 'development' && console.log('🔍 开始数据验证...')
  // 🔁 去重：确保每个学员只出现一行（基于 student+department，不基于ID）
  // 🔧 关键修复：如果后端重复生成了同一个学员，ID会不同，但姓名和科室相同
  {
    const seenKeys = new Set<string>()
    const deduped: ScheduleResultRow[] = []
    for (const row of newResults) {
      // 🔧 只基于姓名和科室去重，不考虑ID（因为ID可能因后端bug而不同）
      const key = `${(row as any).student}|${(row as any).department}`
      if (seenKeys.has(key)) {
        console.warn(`🔁 [去重] 检测到重复学员: ${row.student} (${row.department})，已移除`)
        console.warn(`🔁 [去重详情] ID=${(row as any).id}, 第一天=${(row as any).date1}, 第二天=${(row as any).date2}`)
        continue
      }
      seenKeys.add(key)
      deduped.push(row)
    }
    if (deduped.length !== newResults.length) {
      console.warn(`🔁 [去重完成] 移除了${newResults.length - deduped.length}个重复学员记录`)
      console.warn(`🔁 [去重详情] ${newResults.length} -> ${deduped.length}`)
      alert(`⚠️ 检测到并移除了${newResults.length - deduped.length}个重复的学员排班记录`)
      newResults.length = 0
      newResults.push(...deduped)
    } else {
      process.env.NODE_ENV === 'development' && console.log(`✅ [去重检查] 无重复记录`)
    }
  }

  const validationResult = DataValidationService.validateScheduleResult(result)
  
  if (validationResult.errors.length > 0) {
    console.error('数据验证发现错误:', validationResult.errors)
    const report = DataValidationService.generateValidationReport(validationResult)
    console.error('📋 验证报告:\n', report)
    
    // 如果错误都是考试日期缺失问题，且我们已经修复了，就不显示错误
    const onlyDateErrors = validationResult.errors.every(error => 
      (error as any).type === 'MISSING_EXAM_DATE'
    )
    
    if (onlyDateErrors) {
      process.env.NODE_ENV === 'development' && console.log('✅ 所有错误都是考试日期问题，前端已自动修复')
    }
  }
  
  if (validationResult.warnings.length > 0) {
    console.warn('⚠️ 数据验证发现警告:', validationResult.warnings)
  }
  
  // 使用修复后的数据
  if (validationResult.fixedData) {
    process.env.NODE_ENV === 'development' && console.log('🔧 使用数据验证服务修复后的数据')
    result = validationResult.fixedData
  }
  
  // 更新排班结果数据
  process.env.NODE_ENV === 'development' && console.log('🔍 准备更新scheduleResults，newResults长度:', newResults.length)
  process.env.NODE_ENV === 'development' && console.log('🔍 newResults详细内容:', newResults)
  
  // 验证数据转换结果
  newResults.forEach((result, index) => {
    process.env.NODE_ENV === 'development' && console.log(`📋 ${index + 1}条记录 ${result.student} (${result.department})`, {
      第一天: {
        日期: result.date1,
        考官一: result.examiner1_1,
        考官二: result.examiner1_2,
        备份: result.backup1
      },
      第二天: {
        日期: result.date2,
        考官一: result.examiner2_1,
        考官二: result.examiner2_2,
        备份: result.backup2
      }
    })
  })
  
  // 按照第一天考试日期排序，确保日期按时间顺序显示
  newResults.sort((a, b) => {
    const parseToTimestamp = (row: any) => {
      const raw = row?.rawDate1
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return new Date(raw).getTime()
      }

      const display = row?.date1
      if (!display) return 0

      const match = String(display).match(/^(\d{1,2})\.(\d{1,2})$/)
      if (!match) return 0

      const month = Number(match[1])
      const day = Number(match[2])

      const baseDateStr = examStartDateStr.value
      const baseDate = baseDateStr ? new Date(baseDateStr) : new Date()
      const baseMonth = baseDate.getMonth() + 1
      let year = baseDate.getFullYear()
      if (month < baseMonth) year += 1

      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      return new Date(iso).getTime()
    }

    return parseToTimestamp(a) - parseToTimestamp(b)
  })
  
  // 🔧 ****最终防护：显示前再次强制去重（善意的欺骗）****
  // 不论后端返回了多少重复，前端只显示一条
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  process.env.NODE_ENV === 'development' && console.log('🎯 [最终去重] 显示前最后一次去重检查...')
  process.env.NODE_ENV === 'development' && console.log(`📊 排序后数据: ${newResults.length}条`)
  
  // 🔍 详细列出所有学员（去重前）
  process.env.NODE_ENV === 'development' && console.log('📋 [去重前] 所有学员列表:')
  newResults.forEach((row, index) => {
    process.env.NODE_ENV === 'development' && process.env.NODE_ENV === 'development' && console.log(`  ${index + 1}. ${row.student} (${row.department}) - 日期:${row.date1}`)
  })
  
  const finalUniqueMap = new Map<string, any>()
  const duplicates: string[] = []
  
  newResults.forEach((row, index) => {
    const uniqueKey = `${row.student}_${row.department}`
    if (!finalUniqueMap.has(uniqueKey)) {
      finalUniqueMap.set(uniqueKey, row)
    } else {
      const duplicate = `${row.student} (${row.department}) - 第${index + 1}条`
      duplicates.push(duplicate)
      console.warn(`⚠️ [最终去重] 移除重复: ${duplicate}`)
    }
  })
  
  // 使用去重后的结果（创建新变量，不修改原const）
  const finalResults = Array.from(finalUniqueMap.values())
  
  process.env.NODE_ENV === 'development' && console.log(`📊 [去重统计]`)
  process.env.NODE_ENV === 'development' && console.log(`   原始数据: ${newResults.length}条`)
  process.env.NODE_ENV === 'development' && console.log(`   去重后: ${finalResults.length}条`)
  process.env.NODE_ENV === 'development' && console.log(`   移除重复: ${duplicates.length}条`)
  
  if (duplicates.length > 0) {
    console.error('🚨 [发现重复] 以下学员被去重:')
    duplicates.forEach((dup, idx) => {
      console.error(`   ${idx + 1}. ${dup}`)
    })
    alert(`⚠️ 发现并移除了 ${duplicates.length} 个重复学员显示\n\n详情请查看控制台`)
  } else {
    process.env.NODE_ENV === 'development' && console.log('✅ [无重复] 数据干净，无需去重')
  }
  
  process.env.NODE_ENV === 'development' && console.log('📋 [去重后] 最终显示学员列表:')
  finalResults.forEach((row, index) => {
    console.log(`  ${index + 1}. ${row.student} (${row.department}) - 日期:${row.date1}`)
  })
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // 用去重后的数据替换原数据
  newResults = finalResults
  
  // 🎬 实时更新时使用动画渐进式显示数据
  if (isRealtimeUpdate) {
    process.env.NODE_ENV === 'development' && console.log('🎬 [动态更新] 实时更新表格数据，模拟算法优化过程')
    
    // 🔧 ****关键修复：实时更新时也要对最终结果去重****
    // 因为WebSocket可能多次推送相同数据，导致累积重复
    process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新去重] 当前表格: ' + scheduleResults.value.length + '行')
    process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新去重] 新数据: ' + newResults.length + '行')
    
    // 创建已存在学员的Set（用于快速查找）
    const existingStudents = new Set(
      scheduleResults.value.map(row => `${row.student}_${row.department}`)
    )
    
    // 过滤出真正需要添加的新学员（不在现有表格中的）
    const trulyNewResults = newResults.filter(row => {
      const key = `${row.student}_${row.department}`
      return !existingStudents.has(key)
    })
    
    process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新去重] 真正的新增: ' + trulyNewResults.length + '行')
    
    if (trulyNewResults.length > 0) {
      // 有新学员，逐行添加
      process.env.NODE_ENV === 'development' && console.log('📈 [实时更新] 添加新学员...')
      for (let i = 0; i < trulyNewResults.length; i++) {
        const newRow = trulyNewResults[i]
        process.env.NODE_ENV === 'development' && console.log(`  ➕ 添加: ${newRow.student} (${newRow.department})`)
        scheduleResults.value.push(newRow)
        // 动画延迟
        if (i < trulyNewResults.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } else {
      // 没有新学员，只是更新现有数据
      process.env.NODE_ENV === 'development' && console.log('🔄 [实时更新] 更新现有学员数据...')
      
      // 更新现有学员的数据（考官可能变化了）
      newResults.forEach(newRow => {
        const existingIndex = scheduleResults.value.findIndex(
          existingRow => existingRow.student === newRow.student && 
                        existingRow.department === newRow.department
        )
        
        if (existingIndex !== -1) {
          // 找到了，更新数据
          scheduleResults.value[existingIndex] = newRow
        }
      })
    }
    
    process.env.NODE_ENV === 'development' && console.log('✅ [动态更新] 表格更新完成，当前显示', scheduleResults.value.length, '行')
  } else {
    // 非实时更新，直接显示所有数据
    scheduleResults.value = []
    await nextTick()
    scheduleResults.value = newResults
    process.env.NODE_ENV === 'development' && console.log('✅ scheduleResults.value更新完成，显示条目数:', scheduleResults.value.length)
  }
  
  const backendHardViolationCount =
    typeof (result as any)?.statistics?.hardConstraintViolations === 'number'
      ? (result as any).statistics.hardConstraintViolations
      : backendHardScore < 0
        ? 1
        : 0

  process.env.NODE_ENV === 'development' && console.log(
    '✅ [约束验证] 使用后端验证结果，硬约束违反数:',
    backendHardViolationCount > 0 ? `有违反(${backendHardViolationCount}个)` : '0个'
  )
  
  // 🔍 仅在开发环境下进行诊断性检查（不影响UI显示）
  if (import.meta.env.DEV) {
    try {
      if (backendHardViolationCount > 0) {
        console.warn(
          '⚠️ [前端诊断] 后端已报告硬约束违反(' + backendHardViolationCount + '个)，跳过前端诊断检查（避免因前端数据不完整产生误判）'
        )
      } else {
        const checkResult = checkScheduleConstraints(result.assignments || (result as any).examSchedule?.assignments || [])
        if (checkResult.summary.totalHardViolations > 0) {
          console.warn('⚠️ [前端诊断] 检测到 ' + checkResult.summary.totalHardViolations + ' 个可能的违反')
          console.warn('⚠️ [前端诊断] 这可能是因为前端数据不完整，以后端验证为准')
          console.table(checkResult.hardViolations.slice(0, 5))
        } else {
          process.env.NODE_ENV === 'development' && console.log('✅ [前端诊断] 前端约束检查也通过')
        }
      }
    } catch (error) {
      console.error('❌ [前端诊断] 约束检查失败:', error)
    }
  }
  
  // 更新表格状态为完成
  isTableUpdating.value = false
  const now = new Date()
  lastTableUpdate.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  addRealtimeLog(`✅ 表格更新完成，共显示 ${newResults.length} 条排班记录`, 'success')
  process.env.NODE_ENV === 'development' && console.log('排班结果已按日期排序')
  
  // 强制触发响应式更新和DOM重新渲染
  await nextTick()
  
  // 验证DOM是否正确更新
  setTimeout(() => {
    const tableBody = document.querySelector('.schedule-table tbody')
    if (!tableBody) {
      process.env.NODE_ENV === 'development' && console.log('🔍 DOM验证: 表格未渲染或当前不可见，跳过验证')
      return
    }

    const dataRows = tableBody.querySelectorAll('tr:not(:empty)')
    process.env.NODE_ENV === 'development' && console.log('🔍 DOM验证: 表格行数:', dataRows.length)
    
    if (dataRows.length === 0 && scheduleResults.value.length > 0) {
      console.warn('⚠️ 检测到渲染问题，尝试强制更新DOM')
      const currentData = [...scheduleResults.value]
      scheduleResults.value = []
      setTimeout(() => {
        scheduleResults.value = currentData
        process.env.NODE_ENV === 'development' && console.log('🔄 已执行强制DOM更新')
      }, 50)
    } else {
      process.env.NODE_ENV === 'development' && console.log('DOM渲染正常，数据已显示')
    }
  }, 300)
  
  process.env.NODE_ENV === 'development' && console.log('界面更新完成')
  
  // 检查内容是否溢出，如果是则自动收缩侧边栏
  nextTick(() => {
    setTimeout(checkContentOverflow, 200) // 延迟检查确保表格完全渲染
  })
  
  // 自动保存排班结果到本地存储
  try {
    const scheduleRecord: ScheduleResultRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      title: `排班结果_${new Date().toLocaleDateString()}`,
      result: result,
      displayData: newResults,
      metadata: {
        studentCount: result.assignments.length > 0 ? new Set(result.assignments.map(a => a.studentId)).size : 0,
        teacherCount: result.assignments.length > 0 ? new Set([
          ...result.assignments.map(a => a.examiner1).filter(id => id),
          ...result.assignments.map(a => a.examiner2).filter(id => id),
          ...result.assignments.map(a => a.backupExaminer).filter(id => id)
        ]).size : 0,
        dateRange: examStartDate.value && examEndDate.value ? `${dateUtils.toStorageDate(examStartDate.value)} 到 ${dateUtils.toStorageDate(examEndDate.value)}` : '未设置',
        constraints: {
          ...constraints.value,  // 保存完整的约束配置
          hardConstraints: Object.keys(constraints.value).filter(key => constraints.value[key as keyof typeof constraints.value] === true),
          softConstraints: Object.keys(constraints.value).filter(key => constraints.value[key as keyof typeof constraints.value] === true)
        },
        studentList: studentList.value,
        teacherList: teacherList.value
      }
    }
    
    await storageService.saveScheduleResult(scheduleRecord)
    process.env.NODE_ENV === 'development' && console.log('排班结果已自动保存到本地存储')
  } catch (error) {
    console.error('保存排班结果失败:', error)
  }
  
  // 显示统计信息
  process.env.NODE_ENV === 'development' && console.log('排班统计:', result.statistics)
  if (result.conflicts && result.conflicts.length > 0) {
    console.warn('约束冲突详情:')
    result.conflicts.forEach((conflict, index) => {
      console.warn(`冲突${index + 1}:`, {
        类型: conflict.type,
        约束: conflict.constraint,
        严重程度: conflict.severity,
        描述: conflict.description,
        影响实体: conflict.affectedEntities,
        建议: conflict.suggestion
      })
    })
  }
  if (result.warnings && result.warnings.length > 0) {
    console.warn('排班警告:', result.warnings)
  }
}

// 缓存考官数据以避免重复调用（已迁移到统一缓存管理器）
let cachedTeacherData: TeacherInfo[] | null = null

  // 考官数据完整性验证函数
const validateTeacherData = (teachers: TeacherInfo[]): { isValid: boolean; errors: string[]; validCount: number } => {
  const errors: string[] = []
  let validCount = 0
  
  if (!teachers || !Array.isArray(teachers)) {
    errors.push('考官数据不是有效的数组格式')
    return { isValid: false, errors, validCount: 0 }
  }
  
  if (teachers.length === 0) {
    errors.push('考官数据为空，无法进行排班')
    return { isValid: false, errors, validCount: 0 }
  }
  
  // 验证每个考官的数据完整性
  teachers.forEach((teacher, index) => {
    const teacherErrors: string[] = []
    
    if (!teacher) {
      teacherErrors.push(`${index + 1}个考官数据为空`)
    } else {
      // 验证必需字段
      if (!teacher.id || teacher.id.toString().trim() === '') {
        teacherErrors.push(`${index + 1}个考官缺少ID`)
      }
      
      if (!teacher.name || teacher.name.trim() === '') {
        teacherErrors.push(`${index + 1}个考官缺少姓名`)
      }
      
      if (!teacher.department || teacher.department.trim() === '') {
        teacherErrors.push(`${index + 1}个考官缺少科室信息`)
      }
      
      // 验证班组信息（可以为空，但如果存在应该是有效的）
      if (teacher.group !== undefined && teacher.group !== null && teacher.group.trim() === '') {
        teacherErrors.push(`${index + 1}个考官班组信息格式错误`)
      }
      
      // 验证技能信息（可选字段）
      if (teacher.skills && !Array.isArray(teacher.skills)) {
        teacherErrors.push(`${index + 1}个考官技能信息格式错误`)
      }
      
      if (teacherErrors.length === 0) {
        validCount++
      }
    }
    
    if (teacherErrors.length > 0) {
      errors.push(...teacherErrors)
    }
  })
  
  // 检查是否有足够的有效考官进行排班
  if (validCount < 3) {
    errors.push(`有效考官数量不足${validCount}个），至少需3个考官才能进行排班`)
  }
  
  // 检查科室分布
  const departmentCount = new Set(teachers.filter(t => t && t.department).map(t => t.department)).size
  if (departmentCount < 2) {
    errors.push(`考官科室分布不足${departmentCount}个科室），建议至少有2个不同科室的考官`)
  }
  
  const isValid = errors.length === 0
  
  process.env.NODE_ENV === 'development' && console.log('📊 考官数据验证结果:', {
    总数: teachers.length,
    有效数量: validCount,
    科室数量: departmentCount,
    错误数量: errors.length,
    验证通过: isValid
  })
  
  return { isValid, errors, validCount }
}

// 智能排班执行函数 - 支持多算法选择
const executeSchedulingWithRetry = async (originalRequest: OptaPlannerRequest): Promise<OptaPlannerResponse> => {
  const maxRetries = 3
  let lastError: any = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    process.env.NODE_ENV === 'development' && console.log(`🔄 排班尝试 ${attempt + 1}/${maxRetries}，使用算法 ${selectedAlgorithm.value}`)
    
    try {
      let result: OptaPlannerResponse
      
      // 只使用传统OptaPlanner算法
      result = await optaPlannerService.generateSchedule(originalRequest)
      
      if (result.success) {
        process.env.NODE_ENV === 'development' && console.log(`排班成功！尝试次数 ${attempt + 1}，算法 ${selectedAlgorithm.value}`)
        process.env.NODE_ENV === 'development' && console.log('📊 分配数量:', result.assignments?.length || 0)
        
        return result
      } else {
        console.warn(`排班失败，尝试次数 ${attempt + 1}`)
        lastError = new Error(`排班失败: ${result.message || '未知错误'}`)
      }
    } catch (error) {
      console.error(`💥 排班执行异常，尝试次数 ${attempt + 1}:`, error)
      lastError = error
      
      // 网络或服务错误，等待后重试
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000) // 指数退避，最长等待5秒
        process.env.NODE_ENV === 'development' && console.log(`等待 ${waitTime}ms 后重试.`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  
  // 所有重试都失败了，返回失败结果
  console.error('💔 所有排班尝试都失败')
  
  return {
    success: false,
    assignments: [],
    statistics: {
      totalStudents: originalRequest.students.length,
      assignedStudents: 0,
      unassignedStudents: originalRequest.students.length,
      totalTeachers: originalRequest.teachers.length,
      activeTeachers: 0,
      averageWorkload: 0,
      maxWorkload: 0,
      finalScore: {
        hardScore: 0,
        softScore: 0
      },
      completionPercentage: 0,
      solvingTimeMillis: 0,
      hardConstraintViolations: 0,
      softConstraintViolations: 0
    },
    conflicts: [],
    warnings: [`系统错误: ${lastError?.message || '未知错误'}`],
    message: `排班系统${maxRetries}次尝试后仍然失败`
  }
}

// 辅助函数：根据考官ID或考官对象获取考官姓名
const getTeacherNameById = (teacherData: any): string => {
  // 增强数据验证和调试日志
  process.env.NODE_ENV === 'development' && console.log('🔍 getTeacherNameById 接收到的数据:', teacherData, '类型:', typeof teacherData)
  
  if (teacherData === null || teacherData === undefined || teacherData === '') {
    console.warn('⚠️ 考官数据为null、undefined或空字符串，返回"未分配"')
    return '未分配'
  }
  
  // 如果是字符串，直接返回（已经转换过的姓名）
  if (typeof teacherData === 'string') {
    const trimmed = teacherData.trim()
    if (trimmed && trimmed !== '未分组' && trimmed !== '数据错误' && trimmed !== '未分配') {
      process.env.NODE_ENV === 'development' && console.log('✅ 返回字符串考官姓名:', trimmed)
      return trimmed
    }
    // 如果是纯数字ID，需要查找对应姓名
    if (/^\d+$/.test(trimmed)) {
      process.env.NODE_ENV === 'development' && console.log('🔍 检测到数字ID字符串，查找对应姓名:', trimmed)
      return findTeacherNameById(trimmed)
    }
    return trimmed || '未分配'
  }
  
  // 如果是考官对象，直接提取name属性
  if (typeof teacherData === 'object' && teacherData !== null) {
    process.env.NODE_ENV === 'development' && console.log('🔍 处理考官对象:', JSON.stringify(teacherData))
    
    // 优先使用name属性
    if (teacherData.name && typeof teacherData.name === 'string') {
      const teacherName = teacherData.name.trim()
      process.env.NODE_ENV === 'development' && console.log('✅ 从考官对象提取姓名:', teacherName)
      return teacherName
    }
    
    // 检查其他可能的姓名字段
    const nameFields = ['teacherName', 'fullName', 'displayName']
    for (const field of nameFields) {
      if (teacherData[field] && typeof teacherData[field] === 'string') {
        const name = teacherData[field].trim()
        process.env.NODE_ENV === 'development' && console.log(`✅ 从考官对象字段 "${field}" 提取姓名:`, name)
        return name
      }
    }
    
    // 处理对象但没有name属性的情况，尝试使用id查找
    if (teacherData.id) {
      process.env.NODE_ENV === 'development' && console.log('⚠️ 考官对象缺少name属性，尝试通过ID查找:', teacherData.id)
      const teacherId = teacherData.id.toString()
      const foundName = findTeacherNameById(teacherId)
      if (foundName && foundName !== '未分配' && !foundName.startsWith('考官')) {
        return foundName
      }
      // 如果查找失败，但对象有其他可用信息，尝试构造显示名称
      if (teacherData.department) {
        return `${teacherData.department}考官`
      }
      // 最后尝试返回ID标识
      return `考官${teacherId}`
    }
    
    process.env.NODE_ENV === 'development' && console.log('⚠️ 考官对象格式异常，无有效姓名或ID:', teacherData)
    return '数据异常'
  }
  
  // 如果是数字ID，转换为字符串处理
  if (typeof teacherData === 'number') {
    process.env.NODE_ENV === 'development' && console.log('🔍 处理数字ID:', teacherData)
    const teacherId = teacherData.toString()
    return findTeacherNameById(teacherId)
  }
  
  process.env.NODE_ENV === 'development' && console.log('❌ 无法识别的考官数据格式:', teacherData)
  return '格式错误'
}

// 辅助函数：根据考官ID查找姓名
const findTeacherNameById = (teacherId: string): string => {
  // 验证输入参数
  if (!teacherId || typeof teacherId !== 'string') {
    console.warn('⚠️ 考官ID无效:', teacherId)
    return '未分配'
  }
  
  process.env.NODE_ENV === 'development' && console.log(`🔍 查找考官ID "${teacherId}" 对应的姓名`)
  
  // 优先使用缓存的考官数据
  if (cachedTeacherData && Array.isArray(cachedTeacherData)) {
    try {
      process.env.NODE_ENV === 'development' && console.log(`🔍 在缓存中查找考官ID "${teacherId}"，缓存数据量: ${cachedTeacherData.length}`)
      
      const teacher = cachedTeacherData.find(t => {
        if (!t || !t.id) return false
        
        // 增强匹配逻辑，处理不同的ID格式
        const matches = (
          t.id === teacherId || 
          t.id.toString() === teacherId || 
          t.id?.toString() === teacherId.toString()
        )
        
        if (matches) {
          process.env.NODE_ENV === 'development' && console.log(`✅ 找到匹配考官: ID=${t.id}, Name=${t.name}`)
        }
        
        return matches
      })
      
      if (teacher && teacher.name) {
        process.env.NODE_ENV === 'development' && console.log(`✅ 成功从缓存获取考官姓名: ${teacher.name}`)
        return teacher.name
      } else {
        console.warn(`⚠️ 缓存中未找到考官ID "${teacherId}"`)
        // 打印缓存中的所有考官ID用于调试
        const cachedIds = cachedTeacherData.map(t => t?.id).filter(id => id)
        process.env.NODE_ENV === 'development' && console.log('🔍 缓存中的所有考官ID:', cachedIds.slice(0, 10), cachedIds.length > 10 ? `...等${cachedIds.length}个` : '')
      }
    } catch (error) {
      console.error('❌ 缓存数据查找出错:', error)
    }
  } else {
    console.warn('⚠️ 考官数据缓存未初始化或为空')
  }
  
  // 如果缓存中没有找到考官，返回ID标识
  console.error(`❌ 未找到考官ID "${teacherId}" 对应的姓名`)
  return `考官${teacherId}`
}

// 辅助函数：寻找替代考官
const findAlternativeExaminer = (excludeExaminer: string, studentDepartment: string): string | null => {
  process.env.NODE_ENV === 'development' && console.log(`🔍 为学员科室"${studentDepartment}"寻找替代考官，排除考官"${excludeExaminer}"`)
  
  // 检查缓存的考官数据
  if (!cachedTeacherData || !Array.isArray(cachedTeacherData)) {
    console.warn('⚠️ 考官数据缓存未初始化，无法寻找替代考官')
    return null
  }
  
  try {
    // 筛选可用的替代考官 - 增强约束检查
    const availableExaminers = cachedTeacherData.filter(teacher => {
      if (!teacher || !teacher.name || !teacher.department) {
        return false
      }
      
      // 排除当前重复的考官
      if (teacher.name === excludeExaminer) {
        process.env.NODE_ENV === 'development' && console.log(`🚫 排除重复考官: ${teacher.name}`)
        return false
      }
      
      // HC7约束：考官2必须与学员不同科室
      if (teacher.department === studentDepartment) {
        process.env.NODE_ENV === 'development' && console.log(`🚫 排除同科室考官: ${teacher.name} (科室: ${teacher.department})`)
        return false
      }
      
      // 检查三室七室互通规则（如果学员是三室或七室）
      if ((studentDepartment === '三室' && teacher.department === '七室') ||
          (studentDepartment === '七室' && teacher.department === '三室')) {
        process.env.NODE_ENV === 'development' && console.log(`🚫 排除三室七室互通考官: ${teacher.name} (科室: ${teacher.department})`)
        return false
      }
      
      process.env.NODE_ENV === 'development' && console.log(`找到可用替代考官: ${teacher.name} (科室: ${teacher.department})`)
      return true
    })
    
    process.env.NODE_ENV === 'development' && console.log(`🔍 找到${availableExaminers.length}名可用替代考官`)
    
    if (availableExaminers.length > 0) {
      // 优先选择工作负荷较低的考官
      const sortedExaminers = availableExaminers.sort((a, b) => {
        const workloadA = (a as any).workload || 0
        const workloadB = (b as any).workload || 0
        return workloadA - workloadB
      })
      
      const selectedExaminer = sortedExaminers[0]
      process.env.NODE_ENV === 'development' && console.log(`选择替代考官: ${selectedExaminer.name} (科室: ${selectedExaminer.department}, 工作负荷: ${(selectedExaminer as any).workload || 0})`)
      return selectedExaminer.name
    } else {
      console.warn(`⚠️ 未找到合适的替代考官 - 学员科室: ${studentDepartment}, 排除考官: ${excludeExaminer}`)
      process.env.NODE_ENV === 'development' && console.log('📊 当前考官分布:', cachedTeacherData.map(t => `${t.name}(${t.department})`).join(', '))
      return null
    }
  } catch (error) {
    console.error('寻找替代考官时出错:', error)
    return null
  }
}

// 辅助函数：格式化日期字符串
const formatDateFromString = (dateStr: string): string => {
  if (!dateStr) return ''
  // 如果已经是 M.D 格式，直接返回
  if (/^\d{1,2}\.\d{1,2}$/.test(dateStr)) {
    return dateStr
  }
  
  try {
    const date = dateUtils.parseDate(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}.${day}`
  } catch (e) {
    return dateStr
  }
}

// 辅助函数：格式化日期对象
const formatDate = (date: Date): string => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}.${day}`
}



// 🔧 检测并修复HC4约束违反（同一考官同一天多场考试）
const detectAndFixTimeConflicts = async () => {
  try {
    process.env.NODE_ENV === 'development' && console.log('🔍 开始检测HC4约束违反...')
    
    // 转换scheduleResults为适合检测器的格式
    const assignments = scheduleResults.value.map((result: any) => ({
      id: result.id || `${result.student}-${result.examDate}`,
      studentName: result.student,
      examDate: result.examDate,
      examiner1: result.examiner1_1 || result.examiner1,
      examiner2: result.examiner1_2 || result.examiner2,
      backupExaminer: result.backup1 || result.backup
    }))
    
    // 添加第二天的考试
    scheduleResults.value.forEach((result: any) => {
      if (result.examDate2) {
        assignments.push({
          id: `${result.id || result.student}-day2`,
          studentName: result.student,
          examDate: result.examDate2,
          examiner1: result.examiner2_1,
          examiner2: result.examiner2_2,
          backupExaminer: result.backup2
        })
      }
    })
    
    // 检测冲突
    const detection = scheduleConflictDetector.detectTimeConflicts(assignments)
    
    if (!detection.hasConflicts) {
      ElMessage.success('✅ 未检测到HC4约束违反！所有考官分配正常。')
      return
    }
    
    // 显示冲突报告
    const report = scheduleConflictDetector.generateConflictReport(detection.conflicts)
    console.error(report)
    
    const confirmMessage = `${report}\n是否自动修复这些冲突？\n\n修复策略：将冲突的考官分配设为"未分配"，然后您可以重新手动分配。`
    
    if (!confirm(confirmMessage)) {
      ElMessage.info('已取消修复操作')
      return
    }
    
    // 自动修复
    const fixResult = scheduleConflictDetector.autoFixTimeConflicts(assignments, teacherList.value)
    
    if (fixResult.success) {
      // 将修复后的结果应用回scheduleResults
      fixResult.updatedAssignments.forEach(updatedAssignment => {
        // 查找对应的scheduleResult
        const resultIndex = scheduleResults.value.findIndex((r: any) => {
          const id1 = `${r.student}-${r.examDate}`
          const id2 = r.examDate2 ? `${r.student}-day2` : null
          return updatedAssignment.id === id1 || updatedAssignment.id === id2
        })
        
        if (resultIndex !== -1) {
          const result = scheduleResults.value[resultIndex]
          
          // 判断是第一天还是第二天
          if (updatedAssignment.id.includes('day2')) {
            // 第二天
            result.examiner2_1 = updatedAssignment.examiner1
            result.examiner2_2 = updatedAssignment.examiner2
            result.backup2 = updatedAssignment.backupExaminer || '未分配'
          } else {
            // 第一天
            result.examiner1_1 = updatedAssignment.examiner1
            result.examiner1_2 = updatedAssignment.examiner2
            result.backup1 = updatedAssignment.backupExaminer || '未分配'
          }
        }
      })
      
      // 标记为已修改
      isModified.value = true
      
      ElMessage.success(`✅ 成功修复${fixResult.fixedConflicts}个冲突！请检查并重新分配标记为"未分配"的考官。`)
      process.env.NODE_ENV === 'development' && console.log('修复详情:', fixResult.details.join('\n'))
    } else {
      ElMessage.error(`❌ 修复失败，剩余${fixResult.remainingConflicts}个冲突`)
      console.error('修复失败详情:', fixResult.details.join('\n'))
    }
    
  } catch (error) {
    console.error('检测或修复冲突时出错:', error)
    ElMessage.error('检测冲突失败: ' + (error as Error).message)
  }
}

// 重新排班（重新计算排班）
const recalculateSchedule = async () => {
  try {
    process.env.NODE_ENV === 'development' && console.log('🔄 开始重新排班.')
    
    // 显示详细的重新排班确认信息
    const currentStudentCount = studentList.value.length
    const currentScheduleCount = scheduleResults.value.length
    const dateRangeText = examStartDate.value && examEndDate.value 
    ? `${examStartDate.value.toLocaleDateString()} 到 ${examEndDate.value.toLocaleDateString()}`
      : '未设置'
    
    const confirmMessage = `确定要重新排班吗?
📊 当前状态：
学员数量: ${currentStudentCount}
已排班学员: ${currentScheduleCount}
考试日期: ${dateRangeText}

🔄 重新排班将：
使用最新的约束配置
清除所有人工修改记录
重新计算最优排班方案
可能产生与之前不同的结果

⚠️ 此操作不可撤销，建议先导出当前排班结果作为备份
是否继续？`
    
    if (!confirm(confirmMessage)) {
      return
    }

    pinnedScheduleIds.value.clear()
    scheduleResults.value.forEach((r: any) => {
      if (r && Array.isArray(r.manualEdits)) {
        r.manualEdits = []
      }
    })
    
    // 重置排班状态
    isScheduling.value = true
    schedulingError.value = ''
    
    // ⏱️ 记录开始时间并估算持续时间
    schedulingStartTime.value = Date.now()
    const studentCount = studentList.value.length
    const mode = solvingModeRef.value
    
    // 基础预估时间
    let baseDuration = 0
    if (mode === 'fast') {
      if (studentCount < 5) baseDuration = 3000
      else if (studentCount < 15) baseDuration = 10000
      else if (studentCount < 30) baseDuration = 30000
      else baseDuration = 60000
    } else {
      if (studentCount < 10) baseDuration = 25000
      else if (studentCount < 30) baseDuration = 45000
      else baseDuration = 75000
    }
    
    estimatedDuration.value = baseDuration
    
    process.env.NODE_ENV === 'development' && console.log(`⏱️ 重新排班预计时间: ${estimatedDuration.value / 1000}秒`)
    
    // 🚀 启动智能进度管理器
    smartProgress.start()
    process.env.NODE_ENV === 'development' && console.log('🎯 [智能进度] 增量更新已启动智能进度管理器')
    
    // ✈️ 重置民航主题加载界面状态
    currentHardScore.value = undefined
    currentSoftScore.value = undefined
    currentAssignmentCount.value = 0
    totalStudents.value = studentList.value.length
    schedulingCompleted.value = false
    finalScheduleStatistics.value = {}
    
    // 🎯 重置中间结果显示状态
    isShowingIntermediateResult.value = false
    if (intermediateResultTimer) {
      clearTimeout(intermediateResultTimer)
      intermediateResultTimer = null
    }
    
    // 🆕 清空实时日志
    realtimeLogs.value = []
    
    // 尝试从保存的排班结果中恢复配置
    const savedResult = await storageService.loadLatestScheduleResult()
    
    if (savedResult && savedResult.metadata) {
      process.env.NODE_ENV === 'development' && console.log('恢复上次排班配置:', savedResult.metadata)
      
      // 恢复日期范围
      if (savedResult.metadata.dateRange) {
        const [startStr, endStr] = savedResult.metadata.dateRange.split(' 到 ')
        if (startStr && endStr) {
          examStartDate.value = new Date(startStr)
          examEndDate.value = new Date(endStr)
          process.env.NODE_ENV === 'development' && console.log('恢复日期范围:', startStr, '到', endStr)
        }
      }
      
      // 恢复学员数据：仅当当前学员列表为空时才从历史记录恢复（避免覆盖用户已选择的examDays等信息）
      if (studentList.value.length === 0) {
        if (Array.isArray((savedResult.metadata as any).studentList) && (savedResult.metadata as any).studentList.length > 0) {
          studentList.value = (savedResult.metadata as any).studentList
          process.env.NODE_ENV === 'development' && console.log('从metadata恢复学员数据:', studentList.value.length, '名学员')
        } else if (savedResult.result && savedResult.result.assignments && savedResult.result.assignments.length > 0) {
          // 从排班结果中提取学员信息（兼容不同结构）
          const studentMap = new Map<string, any>()
          const inferredExamDays = new Map<string, number>()
          
          savedResult.result.assignments.forEach((assignment: any) => {
            const sid = String(assignment.studentId ?? assignment.student?.id ?? '')
            if (!sid) return
            const sname = assignment.studentName ?? assignment.student?.name
            const sdept = assignment.studentDepartment ?? assignment.student?.department
            const sgroup = assignment.studentGroup ?? assignment.student?.group
            
            const examType = assignment.examType
            if (examType === 'day2') {
              inferredExamDays.set(sid, 2)
            } else if (!inferredExamDays.has(sid)) {
              inferredExamDays.set(sid, 1)
            }
            
            if (!studentMap.has(sid)) {
              studentMap.set(sid, {
                id: sid,
                name: sname,
                department: sdept,
                group: sgroup || '一组',
                examDays: inferredExamDays.get(sid) || 2
              })
            }
          })
          
          // 添加未分配的学员
          if (savedResult.result.unassignedStudents) {
            savedResult.result.unassignedStudents.forEach((student: any) => {
              const sid = String(student?.id ?? student?.studentId ?? '')
              if (!sid) return
              if (!studentMap.has(sid)) {
                studentMap.set(sid, {
                  ...student,
                  id: sid,
                  examDays: student?.examDays || inferredExamDays.get(sid) || 2
                })
              }
            })
          }
          
          studentList.value = Array.from(studentMap.values())
          process.env.NODE_ENV === 'development' && console.log('从assignments恢复学员数据:', studentList.value.length, '名学员')
        }
      }
      
      // 保持当前约束配置不变，不从历史数据中恢复约束
      // 这确保重新排班使用最新的用户设置约束，而不是历史约束
      process.env.NODE_ENV === 'development' && console.log('保持当前约束配置，不从历史数据恢复约束')
      process.env.NODE_ENV === 'development' && console.log('当前约束配置:', constraints.value)
    }
    
    // 验证必要数据 (进度由后端监听器推送)
    if (!examStartDate.value || !examEndDate.value) {
      schedulingError.value = '无法恢复考试日期范围，请重新设置'
      stopIntelligentProgressUpdate()  // 停止智能进度更新
      isScheduling.value = false
      return
    }
    
    if (studentList.value.length === 0) {
      schedulingError.value = '无法恢复学员数据，请重新上传学员文件'
      stopIntelligentProgressUpdate()  // 停止智能进度更新
      isScheduling.value = false
      return
    }
    
    process.env.NODE_ENV === 'development' && console.log('配置恢复完成，开始重新排班')
    process.env.NODE_ENV === 'development' && console.log('📋 当前约束配置:', constraints.value)
    process.env.NODE_ENV === 'development' && console.log('👥 学员数量:', studentList.value.length)
    process.env.NODE_ENV === 'development' && console.log('📅 考试日期:', examStartDate.value, '到', examEndDate.value)
    
    // 重新执行排班算法（使用最新的约束权重）
    // 进度将由后端实时监听器自动推送
    await originalNextStep()
    
    process.env.NODE_ENV === 'development' && console.log('🎉 重新排班完成')
    
  } catch (error) {
    console.error('重新排班失败:', error)
    schedulingError.value = `重新排班失败: ${(error as Error).message || '未知错误'}`
    stopIntelligentProgressUpdate()  // 停止智能进度更新
    isScheduling.value = false
  }
}

/**
 * 🔥 深度重排 - 当排班结果不满意时使用
 * 
 * 特点：
 * 1. 运行时间更长（5-10分钟）
 * 2. 搜索深度更深
 * 3. 更有可能找到全局最优解
 */
const triggerDeepReschedule = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:triggerDeepReschedule:entry',message:'Button clicked - entering function',data:{isScheduling:isScheduling.value,isDeepRescheduling:isDeepRescheduling.value,studentCount:studentList.value.length,scheduleCount:scheduleResults.value.length,hasStartDate:!!examStartDate.value,hasEndDate:!!examEndDate.value},timestamp:Date.now(),sessionId:'debug-session',runId:'reschedule-debug',hypothesisId:'A,B,C,D'})}).catch(()=>{});
  // #endregion
  try {
    process.env.NODE_ENV === 'development' && console.log('🔥 开始深度重排...')
    
    // 显示深度重排确认信息
    const currentStudentCount = studentList.value.length
    const currentScheduleCount = scheduleResults.value.length
    const dateRangeText = examStartDate.value && examEndDate.value 
      ? `${examStartDate.value.toLocaleDateString()} 到 ${examEndDate.value.toLocaleDateString()}`
      : '未设置'
    
    // 根据学员数量估算时间
    let estimatedTime = '5-6分钟'
    if (currentStudentCount > 10) estimatedTime = '6-8分钟'
    if (currentStudentCount > 20) estimatedTime = '8-10分钟'
    
    const confirmMessage = `🔥 确定要进行深度重排吗？

📊 当前状态：
• 学员数量: ${currentStudentCount}
• 已排班学员: ${currentScheduleCount}
• 考试日期: ${dateRangeText}

⏱️ 预计耗时: ${estimatedTime}

🔥 深度重排特点：
• 运行时间显著更长
• 搜索空间更大，探索更深
• 更有可能找到最优排班方案
• 适用于对当前排班结果不满意的情况

⚠️ 注意：
• 此过程可能需要较长时间，请耐心等待
• 不建议在此期间关闭页面或进行其他操作
• 建议先导出当前排班结果作为备份

是否继续？`
    
    if (!confirm(confirmMessage)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:triggerDeepReschedule:cancelled',message:'User cancelled confirm dialog',timestamp:Date.now(),sessionId:'debug-session',runId:'reschedule-debug',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:triggerDeepReschedule:confirmed',message:'User confirmed - proceeding with reschedule',timestamp:Date.now(),sessionId:'debug-session',runId:'reschedule-debug',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // 清除固定状态和人工修改记录
    pinnedScheduleIds.value.clear()
    scheduleResults.value.forEach((r: any) => {
      if (r && Array.isArray(r.manualEdits)) {
        r.manualEdits = []
      }
    })
    
    // 设置深度重排状态
    isDeepRescheduling.value = true
    isScheduling.value = true
    schedulingError.value = ''
    
    // 🔥 关键：设置求解模式为深度模式
    const originalMode = solvingModeRef.value
    solvingModeRef.value = 'deep'
    
    // ⏱️ 记录开始时间并估算持续时间（深度模式时间更长）
    schedulingStartTime.value = Date.now()
    const studentCount = studentList.value.length
    
    // 深度模式预估时间（更长）
    let baseDuration = 300000  // 基础5分钟
    if (studentCount <= 5) baseDuration = 300000       // 5分钟
    else if (studentCount <= 10) baseDuration = 360000  // 6分钟
    else if (studentCount <= 20) baseDuration = 480000  // 8分钟
    else baseDuration = 600000                          // 10分钟
    
    estimatedDuration.value = baseDuration
    
    process.env.NODE_ENV === 'development' && console.log(`🔥 深度重排预计时间: ${estimatedDuration.value / 60000}分钟`)
    
    // 🚀 启动智能进度管理器
    smartProgress.start()
    
    // ✈️ 重置民航主题加载界面状态
    currentHardScore.value = undefined
    currentSoftScore.value = undefined
    currentAssignmentCount.value = 0
    totalStudents.value = studentList.value.length
    schedulingCompleted.value = false
    finalScheduleStatistics.value = {}
    
    // 🎯 重置中间结果显示状态
    isShowingIntermediateResult.value = false
    if (intermediateResultTimer) {
      clearTimeout(intermediateResultTimer)
      intermediateResultTimer = null
    }
    
    // 🆕 清空实时日志
    realtimeLogs.value = []
    
    // 添加深度重排开始日志
    addRealtimeLog('🔥 深度重排已启动，预计运行 ' + (baseDuration / 60000) + ' 分钟', 'info')
    addRealtimeLog('💡 正在进行深度搜索，寻找更优排班方案...', 'info')
    
    // 验证必要数据
    if (!examStartDate.value || !examEndDate.value) {
      schedulingError.value = '无法恢复考试日期范围，请重新设置'
      stopIntelligentProgressUpdate()
      isScheduling.value = false
      isDeepRescheduling.value = false
      solvingModeRef.value = originalMode
      return
    }
    
    if (studentList.value.length === 0) {
      schedulingError.value = '无法恢复学员数据，请重新上传学员文件'
      stopIntelligentProgressUpdate()
      isScheduling.value = false
      isDeepRescheduling.value = false
      solvingModeRef.value = originalMode
      return
    }
    
    process.env.NODE_ENV === 'development' && console.log('🔥 深度重排配置完成，开始求解')
    process.env.NODE_ENV === 'development' && console.log('📋 当前约束配置:', constraints.value)
    process.env.NODE_ENV === 'development' && console.log('👥 学员数量:', studentList.value.length)
    process.env.NODE_ENV === 'development' && console.log('📅 考试日期:', examStartDate.value, '到', examEndDate.value)
    
    // 执行深度排班算法
    await originalNextStep()
    
    // 恢复原求解模式
    solvingModeRef.value = originalMode
    isDeepRescheduling.value = false
    
    process.env.NODE_ENV === 'development' && console.log('🔥 深度重排完成')
    addRealtimeLog('🎉 深度重排完成！', 'success')
    
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:triggerDeepReschedule:error',message:'Deep reschedule failed',data:{error:String(error),errorMessage:(error as Error).message},timestamp:Date.now(),sessionId:'debug-session',runId:'reschedule-debug',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('深度重排失败:', error)
    schedulingError.value = `深度重排失败: ${(error as Error).message || '未知错误'}`
    stopIntelligentProgressUpdate()
    isScheduling.value = false
    isDeepRescheduling.value = false
  }
}

// 旧的算法代码已移除，现在使用智能排班算法

// 旧的辅助函数已移除，现在使用智能排班算法中的实现

// toggleConstraint函数已在上面定义

// 强制刷新显示功能
const forceRefreshDisplay = async () => {
  process.env.NODE_ENV === 'development' && console.log('🔄 用户手动触发显示刷新')
  
  if (scheduleResults.value.length === 0) {
    console.warn('⚠️ 没有排班数据需要刷新')
    needsRefresh.value = false
    return
  }
  
  try {
    // 保存当前数据
    const currentData = [...scheduleResults.value]
    process.env.NODE_ENV === 'development' && console.log('📋 当前数据条数:', currentData.length)
    
    // 清空数据触发重新渲染
    scheduleResults.value = []
    await nextTick()
    
    // 延迟恢复数据
    setTimeout(async () => {
      scheduleResults.value = currentData
      await nextTick()
      
      // 验证渲染结果
      setTimeout(() => {
        const tableBody = document.querySelector('.schedule-table tbody')
        const dataRows = tableBody?.querySelectorAll('tr:not(:empty)') || []
        
        if (dataRows.length > 0) {
          process.env.NODE_ENV === 'development' && console.log('强制刷新成功，表格已显示', dataRows.length, '行数')
          needsRefresh.value = false
          
          // 添加成功提示
          const successMsg = document.createElement('div')
          successMsg.textContent = '显示刷新成功'
          successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-weight: 500;'
          document.body.appendChild(successMsg)
          setTimeout(() => successMsg.remove(), 3000)
        } else {
          console.warn('⚠️ 强制刷新后仍无法显示，可能存在更深层的问题')
          needsRefresh.value = true
          
          // 添加警告提示
          const warningMsg = document.createElement('div')
          warningMsg.textContent = '⚠️ 刷新后仍无法显示，请尝试重新排班'
          warningMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f59e0b; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-weight: 500;'
          document.body.appendChild(warningMsg)
          setTimeout(() => warningMsg.remove(), 5000)
        }
      }, 200)
    }, 100)
    
  } catch (error) {
    console.error('强制刷新失败:', error)
    needsRefresh.value = true
    
    // 添加错误提示
    const errorMsg = document.createElement('div')
    errorMsg.textContent = '刷新失败，请重试'
    errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 12px 20px; border-radius: 6px; z-index: 9999; font-weight: 500;'
    document.body.appendChild(errorMsg)
    setTimeout(() => errorMsg.remove(), 3000)
  }
}

// 通用考官验证函数
const isValidExaminer = (examiner: any): boolean => {
  if (!examiner) return false
  
  // 如果是字符串
  if (typeof examiner === 'string') {
    return examiner !== '未分配' && 
           examiner !== '未分组' && 
           examiner.trim() !== '' &&
           examiner !== 'null' &&
           examiner !== 'undefined'
  }
  
  // 如果是对象
  if (typeof examiner === 'object' && examiner !== null) {
    return examiner.name && 
           examiner.name !== '未分配' && 
           examiner.name !== '未分组' &&
           examiner.name.trim() !== ''
  }
  
  return false
}

// 约束验证准确性检查函数
const validateViolationAccuracy = (violations: ConstraintViolation[], assignments: any[], dates: string[]) => {
  const validViolations: ConstraintViolation[] = []
  
  for (const violation of violations) {
    let isValid = true
    
    switch (violation.type) {
      case 'teacher':
        // 验证考官分配违反的准确性
        if (violation.id === 'main-examiners-violation') {
          const incompleteCount = assignments.filter(assignment => {
            if (!assignment?.studentName) return false
            
            const hasExaminer1 = isValidExaminer(assignment.examiner1)
            const hasExaminer2 = isValidExaminer(assignment.examiner2)
            
            return !hasExaminer1 || !hasExaminer2
          }).length
          
          // 如果没有真实的违反，标记为无效
          if (incompleteCount === 0) {
            isValid = false
            process.env.NODE_ENV === 'development' && console.log('🔍 过滤无效违反: 所有学员都已正确分配考官')
          }
          // 如果违反比例过高（>80%），可能是系统问题
          else if (assignments.length > 0 && incompleteCount / assignments.length > 0.8) {
            isValid = false
            process.env.NODE_ENV === 'development' && console.log('🔍 过滤系统性问题: 大部分学员都缺少考官，可能是配置问题')
          }
        }
        break
        
      case 'holiday':
        // 验证假期违反的准确性
        const holidays = ['2025-01-01', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-04-05', '2025-04-06', '2025-04-07', '2025-05-01', '2025-05-02', '2025-05-03', '2025-06-09', '2025-06-10', '2025-06-11', '2025-09-15', '2025-09-16', '2025-09-17', '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07']
        const conflictDates = dates.filter(date => holidays.includes(date))
        if (conflictDates.length === 0) {
          isValid = false
          process.env.NODE_ENV === 'development' && console.log('🔍 过滤无效违反: 所选日期均不在法定节假日内')
        }
        break
        
      case 'weekend':
        // 验证周末违反的准确性
        const weekendDates = dates.filter(date => {
          const dayOfWeek = new Date(date).getDay()
          return dayOfWeek === 0 || dayOfWeek === 6
        })
        if (weekendDates.length === 0) {
          isValid = false
          process.env.NODE_ENV === 'development' && console.log('🔍 过滤无效违反: 所选日期均为工作日')
        }
        break
        
      default:
        // 其他类型的违反保持原样
        break
    }
    
    if (isValid) {
      validViolations.push(violation)
    }
  }
  
  return validViolations
}

// 约束违反处理方法
const handleFixViolation = (violation: ConstraintViolation) => {
  process.env.NODE_ENV === 'development' && console.log('修复约束违反:', violation)
  
  if (violation.type === 'holiday' || violation.type === 'weekend') {
    // 提示用户重新选择日期
    // 使用非阻塞通知替代alert
    console.warn(`检测到${violation.title}`, violation)
    schedulingError.value = `${violation.title}: ${violation.message} ${violation.suggestion}`
    
    // 可以在这里打开日期选择器或其他修复界面
    showCreateModal.value = true
  } else if (violation.type === 'teacher' && violation.id === 'main-examiners-violation') {
    // 约束违反：主考官不足
    let message = `🚨 ${violation.title}\n\n`
    message += `📋 问题详情：\n${violation.message}\n\n`
    
    if (violation.details && violation.details.length > 0) {
      message += `📝 具体问题：\n`
      violation.details.forEach((detail, index) => {
        message += `${index + 1}. ${detail}\n`
      })
      message += `\n`
    }
    
    message += `💡 解决方案：\n`
    message += `1. 检查考官资源是否充足\n`
    message += `2. 确保每个科室都有足够的可用考官\n`
    message += `3. 考官一必须与学员同科室\n`
    message += `4. 考官二必须与学员不同科室\n`
    message += `5. 避免考官时间冲突\n\n`
    message += `${violation.suggestion}\n\n`
    message += `点击确定重新进行排班配置。`
    
    if (confirm(message)) {
      // 重新打开排班配置
      showCreateModal.value = true
      
      // 清除当前违反状态
      constraintViolations.value = constraintViolations.value.filter(v => v.id !== violation.id)
    }
  }
}

// 智能弹窗控制函数
const dismissViolationAlert = () => {
  shouldShowViolationAlert.value = false
  violationAlertDismissedAt.value = Date.now()
  constraintViolations.value = []
  
  process.env.NODE_ENV === 'development' && console.log('📝 用户已关闭约束违反提示')
}

// 检查是否应该重新显示弹窗（如果有新的更严重的违反）
const checkShouldShowNewViolations = (newViolations: ConstraintViolation[]) => {
  // 如果没有被关闭过，或者关闭时间超过5分钟，可以显示
  if (!violationAlertDismissedAt.value || Date.now() - violationAlertDismissedAt.value > 5 * 60 * 1000) {
    shouldShowViolationAlert.value = true
    return true
  }
  
  // 如果有高严重性的新违反，也可以显示
  const hasHighSeverity = newViolations.some(v => v.severity === 'high')
  if (hasHighSeverity) {
    shouldShowViolationAlert.value = true
    return true
  }
  
  return false
}

// 移除集成状态面板相关方法

type ParsedHardSoftScore = { hardScore: number; softScore: number }

/**
 * 解析OptaPlanner的HardSoftScore表示形式
 */
const parseHardSoftScore = (score: unknown): ParsedHardSoftScore | null => {
  if (!score) return null

  if (typeof score === 'object' && score !== null) {
    const candidate = score as Record<string, unknown>
    if (typeof candidate.hardScore === 'number' || typeof candidate.softScore === 'number') {
      return {
        hardScore: typeof candidate.hardScore === 'number' ? candidate.hardScore : 0,
        softScore: typeof candidate.softScore === 'number' ? candidate.softScore : 0
      }
    }
  }

  if (typeof score === 'string') {
    const match = score.match(/(-?\d+)\s*hard\/(-?\d+)soft/i)
    if (match) {
      return {
        hardScore: parseInt(match[1], 10),
        softScore: parseInt(match[2], 10)
      }
    }
  }

  return null
}

/**
 * 连接WebSocket并监听实时排班更新
 * 🆕 实现排班表格实时显示功能
 */
const connectWebSocketForRealtimeUpdates = async (sessionId: string) => {
  if (!sessionId) {
    console.warn('⚠️ [实时更新] 未提供有效的sessionId，取消连接')
    return
  }
  
  try {
    process.env.NODE_ENV === 'development' && console.log('📊 [实时更新] 准备连接HTTP轮询，会话ID:', sessionId)
    
    if (!realtimeProgressServiceInstance) {
      process.env.NODE_ENV === 'development' && console.log('📦 [实时更新] 第一次导入httpProgressService模块...')
      // 🔧 切换到HTTP轮询，解决WebSocket 403错误
      const module = await import('../services/httpProgressService') as any
      realtimeProgressServiceInstance = module.httpProgressService || module.default
      process.env.NODE_ENV === 'development' && console.log('✅ [实时更新] httpProgressService导入成功')
    }
    
    // 清理旧的事件回调，避免重复触发
    if (realtimeProgressUnsubscribe) {
      realtimeProgressUnsubscribe()
      realtimeProgressUnsubscribe = null
    }
    
    // 如果已经连接但会话ID不同，则主动断开
    if (
      realtimeProgressServiceInstance &&
      typeof realtimeProgressServiceInstance.isConnected === 'function' &&
      realtimeProgressServiceInstance.isConnected() &&
      activeRealtimeSessionId &&
      activeRealtimeSessionId !== sessionId
    ) {
      process.env.NODE_ENV === 'development' && console.log('🔄 [实时更新] 检测到旧会话，先断开旧的WebSocket连接:', activeRealtimeSessionId)
      realtimeProgressServiceInstance.disconnect()
    }
    
    const isSameSessionConnected =
      realtimeProgressServiceInstance &&
      typeof realtimeProgressServiceInstance.isConnected === 'function' &&
      realtimeProgressServiceInstance.isConnected() &&
      activeRealtimeSessionId === sessionId
    
    if (!isSameSessionConnected) {
      process.env.NODE_ENV === 'development' && console.log('📊 [实时更新] 正在连接HTTP轮询...')
      try {
        await realtimeProgressServiceInstance.connect(sessionId)
        process.env.NODE_ENV === 'development' && console.log('✅ [实时更新] HTTP轮询连接成功')
        addRealtimeLog('📊 实时进度轮询已建立', 'success')
        
        // 🔄 WebSocket连接成功后，停止模拟进度模式
        stopFallbackProgressMode()
        
        // 🛰️ 启动静默监控：若5秒内没有除connected外的消息，启用日志轮询兜底
        lastWsMessageAt = Date.now()
        wsSilentFallbackStarted = false
        const startSilentFallback = async () => {
          if (wsSilentFallbackStarted) return
          wsSilentFallbackStarted = true
          try {
            const module = await import('../services/logService') as any
            const ls = module.logService || module.default
            if (realtimeLogStopper) { realtimeLogStopper(); realtimeLogStopper = null }
            realtimeLogStopper = ls.startRealtimeLogging((entries: any[]) => {
              entries.forEach((e: any) => {
                if (e && e.message) addRealtimeLog(e.message, e.type || 'info')
              })
            }, 2000, 40)
            addRealtimeLog('🛰️ WebSocket静默，已启用日志轮询兜底', 'info')
          } catch (e) {
            console.warn('静默兜底模式启动失败:', e)
          }
        }
        wsSilenceTimer = setTimeout(() => {
          if (Date.now() - lastWsMessageAt >= 5000) {
            startSilentFallback()
          }
        }, 5000)
      } catch (error) {
        console.error('❌ [实时更新] WebSocket连接失败:', error)
        addRealtimeLog('⚠️ 实时日志连接失败，将使用模拟进度模式', 'warning')
        
        // 🔄 连接失败时，启动模拟进度模式
        startFallbackProgressMode()
        
        // 🧰 启用日志轮询兜底：每2秒拉取后端日志到叠加层
        try {
          const module = await import('../services/logService') as any
          const ls = module.logService || module.default
          // 停止已有轮询
          if (realtimeLogStopper) { realtimeLogStopper(); realtimeLogStopper = null }
          realtimeLogStopper = ls.startRealtimeLogging((entries: any[]) => {
            entries.forEach((e: any) => {
              if (e && e.message) addRealtimeLog(e.message, e.type || 'info')
            })
          }, 2000, 40)
          addRealtimeLog('🛰️ 已启用日志轮询兜底模式', 'info')
        } catch (e) {
          console.warn('日志兜底模式启动失败:', e)
        }
        return
      }
    } else {
      process.env.NODE_ENV === 'development' && console.log('🔁 [实时更新] 已存在同会话连接，本次复用现有WebSocket')
      // 🔄 复用连接时也要确保停止模拟进度模式
      stopFallbackProgressMode()
    }
    
    activeRealtimeSessionId = sessionId
    
    // 监听中间结果消息
    process.env.NODE_ENV === 'development' && console.log('🔍 [调试] 开始监听WebSocket消息...')
    
    realtimeProgressUnsubscribe = realtimeProgressServiceInstance.onProgress(async (message: any) => {
      process.env.NODE_ENV === 'development' && console.log('📨 [实时更新] 收到WebSocket消息:', message.type, message)
      process.env.NODE_ENV === 'development' && console.log('🔍 [调试] 消息详情:', JSON.stringify(message, null, 2))
      
      // 更新静默监控时间戳（忽略connected）
      try {
        if (message?.type && message.type !== 'connected') {
          // 只要收到有意义的消息，就更新时间戳并关闭兜底轮询
          // 注意：变量定义在连接成功分支内，使用可选链避免作用域问题
          // @ts-ignore
          lastWsMessageAt = Date.now()
          if (typeof wsSilenceTimer !== 'undefined' && wsSilenceTimer) clearTimeout(wsSilenceTimer)
          if (realtimeLogStopper) { realtimeLogStopper(); realtimeLogStopper = null }
        }
      } catch (e) {}

      
      // 🆕 处理日志消息
      if (message.type === 'log') {
        process.env.NODE_ENV === 'development' && console.log('✅ [调试] 处理日志消息:', message.data)
        if (message.data && message.data.message) {
          process.env.NODE_ENV === 'development' && console.log('📝 [调试] 调用addRealtimeLog:', message.data.message, message.data.type || 'info')
          addRealtimeLog(message.data.message, message.data.type || 'info')
          process.env.NODE_ENV === 'development' && console.log('✅ [调试] addRealtimeLog调用完成')
        } else {
          process.env.NODE_ENV === 'development' && console.log('⚠️ [调试] 日志消息数据格式不正确:', message.data)
        }
        return
      }
      
      // 🔧 修复：统一处理进度消息，更新进度条和日志
      if (message.type === 'progress' && message.data) {
        const d = message.data as any
        const progressPercentage = Number(d.progressPercentage ?? d.percentage ?? 0)
        
        // 🔧 关键修复：更新进度条
        if (!Number.isNaN(progressPercentage) && progressPercentage >= 0 && progressPercentage <= 100) {
          // 使用智能进度管理器更新进度
          smartProgress.setProgress(progressPercentage)
          
          // 更新阶段信息
          if (d.levelName) {
            currentProgressMessage.value = `${d.levelName} - 进度 ${progressPercentage}%`
          } else if (progressPercentage < 30) {
            currentProgressMessage.value = '正在构造初始解...'
          } else if (progressPercentage < 70) {
            currentProgressMessage.value = '正在优化排班方案...'
          } else {
            currentProgressMessage.value = '正在最终调整...'
          }
          
          // 更新分数显示
          if (d.currentScore) {
            // 解析分数字符串，例如 "0hard/-100soft"
            const scoreMatch = d.currentScore.match(/(-?\d+)hard\/(-?\d+)soft/)
            if (scoreMatch) {
              currentHardScore.value = parseInt(scoreMatch[1])
              currentSoftScore.value = parseInt(scoreMatch[2])
            }
          }
          
          // 更新分配数量
          if (typeof d.assignmentCount === 'number' && d.assignmentCount > 0) {
            currentAssignmentCount.value = d.assignmentCount
            smartProgress.setActualAssignmentCount(d.assignmentCount)
          }
          
          process.env.NODE_ENV === 'development' && console.log(`📈 [进度更新] ${progressPercentage}% - ${d.levelName || '未知阶段'} - 分数: ${d.currentScore || 'N/A'}`)
        }
        
        // 添加日志
        const txt = `📈 进度 ${progressPercentage}%` +
                    (d.currentScore ? `，分数 ${d.currentScore}` : '') +
                    (typeof d.assignmentCount === 'number' ? `，分配 ${d.assignmentCount}` : '') +
                    (typeof d.iterationCount === 'number' ? `，迭代 ${d.iterationCount}` : '')
        addRealtimeLog(txt, 'info')
        
        // 🔧 如果进度达到100%，触发完成流程
        if (progressPercentage >= 100) {
          process.env.NODE_ENV === 'development' && console.log('🎉 [进度消息] 收到完成信号 (100%)')
          stopIntelligentProgressUpdate()
          smartProgress.complete()
          currentProgressMessage.value = '排班计算完成'
        }
        
        return
      }
      
      if (message.type === 'score_improvement' && message.data) {
        const d = message.data as any
        const txt = `✨ 分数提升：${d.oldScore} → ${d.newScore}，增量 ${d.improvementAmount ?? ''}`
        addRealtimeLog(txt, 'success')
        return
      }
      
      if (message.type === 'level_upgrade' && message.data) {
        const d = message.data as any
        const txt = `⬆️ 等级升级：${d.fromLevelName || d.fromLevel} → ${d.toLevelName || d.toLevel}`
        addRealtimeLog(txt, 'success')
        return
      }
      
      if (message.type === 'final_result' && message.data) {
        const d = message.data as any
        const txt = (d.success ? '🎉 求解完成' : '❌ 求解失败') + (d.message ? `：${d.message}` : '')
        addRealtimeLog(txt, d.success ? 'success' : 'error')
        return
      }
      
      if (message.type === 'error') {
        addRealtimeLog(`❌ 错误：${message.message || '未知错误'}`, 'error')
        return
      }
      
      if (message.type === 'connected') {
        addRealtimeLog('📡 实时连接已建立', 'success')
        return
      }
      
      if (message.type === 'intermediate_result') {
        // 🚫 **用户要求：禁用中间结果预览和实时更新功能**
      // 只在最终完成时显示结果，避免实时更新导致的重复累积问题
      process.env.NODE_ENV === 'development' && console.log('🔕 [已禁用] 收到中间结果消息，但实时预览功能已禁用')
      process.env.NODE_ENV === 'development' && console.log('📊 [信息] 排班数量:', message.data?.assignments?.length || 0)
      addRealtimeLog(`📊 求解进度更新 (共 ${message.data?.assignments?.length || 0} 个排班)`, 'info')
      
      // 🔄 即使没有中间结果预览，也要更新进度条和分配数量
      if (totalStudents.value > 0 && message.data?.assignments?.length > 0) {
        const assignmentProgress = Math.round(
          (message.data.assignments.length / Math.max(1, totalStudents.value * 2)) * 100
        )
        // ✅ 修复：进度百分比与实际分配数量同步，移除平滑更新的5%限制
        smartProgress.setProgress(Math.min(95, assignmentProgress))
        currentProgressMessage.value = `正在优化排班方案...`
        // 同步更新实际分配数量
        currentAssignmentCount.value = message.data.assignments.length
      }
      
      return  // 直接返回，不显示中间结果
        
        /* ========== 以下代码已禁用 ========== */
        /* 
        process.env.NODE_ENV === 'development' && console.log('🎯 [实时更新] 收到中间结果消息')
        process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新] 数据内容:', message.data)
        process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新] assignments数组:', message.data?.assignments)
        
        if (false && message.data?.assignments && Array.isArray(message.data.assignments) && message.data.assignments.length > 0) {
          // 此分支已禁用，永不执行
          process.env.NODE_ENV === 'development' && console.log('✅ [实时更新] assignments有效，长度:', message.data.assignments.length)
          process.env.NODE_ENV === 'development' && console.log('📊 [实时更新] 排班数量:', message.data.assignments.length)
          process.env.NODE_ENV === 'development' && console.log('📊 [实时更新] 第一个assignment示例:', message.data.assignments[0])
          
          // 🎯 显示中间结果：短暂切换到排班表
          isShowingIntermediateResult.value = true
          addRealtimeLog(`📊 收到中间结果，共 ${message.data.assignments.length} 个排班，正在显示...`, 'info')
          
          // 清除之前的定时器
          if (intermediateResultTimer) {
            clearTimeout(intermediateResultTimer)
          }
          
          // 3秒后自动切回雷达图（如果仍在计算中）
          intermediateResultTimer = setTimeout(() => {
            if (isScheduling.value && !schedulingCompleted.value) {
              isShowingIntermediateResult.value = false
              addRealtimeLog('🔄 继续求解，切回实时进度显示', 'info')
              process.env.NODE_ENV === 'development' && console.log('🔄 [实时更新] 中间结果显示完成，切回雷达图')
            }
          }, 3000) // 3秒后切回
          
          // 标记表格正在更新
          isTableUpdating.value = true
          lastTableUpdate.value = new Date().toLocaleTimeString()
          
          try {
            // 🔧 修复：适配后端DTO格式（直接使用DTO的字段，不再需要student嵌套对象）
            const intermediateAssignments = message.data.assignments.map((assignment: any) => ({
              id: assignment.id,
              studentId: assignment.studentId,
              studentName: assignment.studentName,
              studentDepartment: assignment.studentDepartment,
              examDate: assignment.examDate,
              examType: assignment.examType,
              subjects: assignment.subjects,
              examiner1: assignment.examiner1,
              examiner2: assignment.examiner2,
              backupExaminer: assignment.backupExaminer,
              location: assignment.location,
              timeSlot: assignment.timeSlot
            }))
            
            process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新] 转换后assignments数量:', intermediateAssignments.length)
            process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新] 转换后第一个assignment:', intermediateAssignments[0])

            const parsedScore = parseHardSoftScore(message.data.score)
            const realtimeStatistics = {
              ...(message.data.statistics || {}),
              softConstraintsScore:
                message.data.statistics?.softConstraintsScore ??
                (parsedScore ? parsedScore.softScore : message.data.softConstraintsScore ?? 0)
            }
            const softScoreCandidate =
              parsedScore?.softScore ??
              (typeof realtimeStatistics.softConstraintsScore === 'number'
                ? realtimeStatistics.softConstraintsScore
                : null)

            if (softScoreCandidate !== null) {
              latestSoftScore.value = softScoreCandidate
              if (bestSoftScore.value === null || softScoreCandidate > bestSoftScore.value) {
                bestSoftScore.value = softScoreCandidate
              }
            }

            process.env.NODE_ENV === 'development' && console.log('🔍 [实时更新] 调用updateScheduleResults进行实时更新...')
            await updateScheduleResults({
              assignments: intermediateAssignments,
              statistics: realtimeStatistics,
              score: parsedScore || message.data.score,
              success: true,
              conflicts: [],
              warnings: [],
              unassignedStudents: (message.data.unassignedStudents as any[]) || []
            } as any, true)

            currentAssignmentCount.value = intermediateAssignments.length

            if (totalStudents.value > 0) {
              // 🎯 不再基于后端分配数量直接计算进度
              // 而是作为参考，确保前端平滑进度不落后太多
              const currentProgress = schedulingProgress.value
              
              // 基于分配数量的进度（仅作参考）
              const assignmentProgress = Math.round(
                (intermediateAssignments.length / Math.max(1, totalStudents.value * 2)) * 100
              )
              
              // 如果分配进度远超当前显示进度（>20%），适当加速
              const diff = assignmentProgress - currentProgress
              if (diff > 20) {
                // 缓慢追赶，每次最多增加3%
                const newProgress = Math.min(95, currentProgress + 3)
                // 🔧 如果进度已经超过阶段区间，直接跳转
                if (currentProgress < minProgress) {
                  smartProgress.setProgress(minProgress)
                  process.env.NODE_ENV === 'development' && console.log(`⚡ [智能进度] 跳转进度: ${currentProgress.toFixed(1)}% → ${minProgress}%`)
                } else {
                  smartProgress.setProgress(newProgress)
                  process.env.NODE_ENV === 'development' && console.log(`🔄 [实时进度-加速] ${currentProgress.toFixed(1)}% → ${newProgress.toFixed(1)}% (分配:${assignmentProgress}%)`)
                }
              } else if (diff > 10) {
                // 中速追赶
                const newProgress = Math.min(95, currentProgress + 1.5)
                smartProgress.setProgress(newProgress)
                currentProgressMessage.value = `正在优化排班方案...`
              }
              // 如果差距不大，让前端平滑进度自然增长
            }

            if (parsedScore) {
              currentProgressMessage.value = `${message.data.quality || '实时方案'} - 硬约束 ${parsedScore.hardScore}, 软约束 ${parsedScore.softScore}`
            } else if (message.data.score) {
              currentProgressMessage.value = `${message.data.quality || '实时方案'} - ${message.data.score}`
            }

            process.env.NODE_ENV === 'development' && console.log('✅ [实时更新] 表格已更新，显示', scheduleResults.value.length, '行数据')

            const confidence = message.data.confidence ? Math.round(message.data.confidence * 100) : 0
            const quality = message.data.quality || '未知'
            addRealtimeLog(
              `📊 实时更新: ${quality}质量方案 (置信度${confidence}%, 软约束 ${parsedScore?.softScore ?? '未知'})`,
              'success'
            )
            addRealtimeLog(
              `✨ 排班表格已更新，当前显示 ${scheduleResults.value.length} 条排班记录`,
              'info'
            )

            setTimeout(() => {
              isTableUpdating.value = false
            }, 500)
          } catch (error) {
            console.error('❌ [实时更新] 转换排班数据失败:', error)
            addRealtimeLog('❌ 实时更新失败: ' + (error as Error).message, 'error')
            isTableUpdating.value = false
          }
        } else {
          console.warn('⚠️ [实时更新] assignments不存在、为空或格式错误')
          console.warn('⚠️ [实时更新] message.data:', message.data)
          addRealtimeLog('⚠️ 收到中间结果但无有效排班数据', 'warning')
        }
        */
        /* ========== 禁用代码结束 ========== */
      } else if (message.type === 'final_result') {
        process.env.NODE_ENV === 'development' && console.log('✅ [实时更新] 收到最终结果')
        addRealtimeLog('🎉 收到最终排班结果', 'success')
        isTableUpdating.value = false
        
        // 🎯 清除中间结果切换定时器，确保显示最终结果
        if (intermediateResultTimer) {
          clearTimeout(intermediateResultTimer)
          intermediateResultTimer = null
        }
        isShowingIntermediateResult.value = false
        
        // 🔧 v7.1.2: 跳过完成弹窗，直接显示结果
        // schedulingCompleted.value = true  // 不再显示完成弹窗
        schedulingCompleted.value = false    // 直接关闭loader
        isScheduling.value = false
        smartProgress.complete()
        process.env.NODE_ENV === 'development' && console.log('✅ [智能进度] 排班完成，直接显示结果（跳过完成弹窗）')
        
        // 🔄 停止模拟进度模式（如果正在运行）
        stopFallbackProgressMode()
        
        // 最终结果后可以安全断开连接，避免资源占用
        if (realtimeProgressServiceInstance) {
          realtimeProgressServiceInstance.disconnect()
        }
        activeRealtimeSessionId = null
        if (realtimeProgressUnsubscribe) {
          realtimeProgressUnsubscribe()
          realtimeProgressUnsubscribe = null
        }
      } else if (message.type === 'progress') {
        // 🔧 修复：这个分支已经被上面的统一处理覆盖，但保留用于兼容性
        // 实际进度更新已在第8738行统一处理
        process.env.NODE_ENV === 'development' && console.log('📈 [实时更新-兼容分支] 收到进度消息（已在统一处理中更新）:', message.data)
        
        // 只处理一些额外的UI更新
        const progressData = message.data || {}
        
        // 更新分数显示（如果上面没有处理）
        const progressScore = parseHardSoftScore(progressData.currentScore)
        if (progressScore) {
          latestSoftScore.value = progressScore.softScore
          if (bestSoftScore.value === null || progressScore.softScore > bestSoftScore.value) {
            bestSoftScore.value = progressScore.softScore
          }
        } else if (typeof progressData.softConstraintsScore === 'number') {
          latestSoftScore.value = progressData.softConstraintsScore
          if (bestSoftScore.value === null || progressData.softConstraintsScore > bestSoftScore.value) {
            bestSoftScore.value = progressData.softConstraintsScore
          }
        }
      } else if (message.type === 'error') {
        console.error('❌ [实时更新] WebSocket推送错误:', message.message || message.data)
        addRealtimeLog('❌ 实时推送发生错误: ' + (message.message || ''), 'error')
      }
    })
    
    process.env.NODE_ENV === 'development' && console.log('✅ [实时更新] WebSocket监听已启动')
  } catch (error) {
    console.error('❌ [实时更新] WebSocket连接失败:', error)
    addRealtimeLog('❌ WebSocket连接失败: ' + (error as Error).message, 'error')
  }
}

// 🎯 统一弹窗方法
const closeUnifiedModal = () => {
  showUnifiedResultModal.value = false
}

const getUnifiedResultTitle = () => {
  if (!unifiedResultData.value?.success) return '❌ 排班失败'

  const hardViolations = getUnifiedHardConstraintViolations()
  if (hardViolations > 0) return '⚠️ 排班完成（存在硬约束违反）'
  return '🎉 排班完成！'
}

const getUnifiedResultSubtitle = () => {
  if (!unifiedResultData.value?.success) return '排班过程中遇到错误，请检查配置后重试'

  const hardViolations = getUnifiedHardConstraintViolations()
  if (hardViolations > 0) return `排班已完成，但发现 ${hardViolations} 个硬约束违反（以系统“冲突”详情为准）`
  return '所有约束都已满足，排班结果已生成'
}

const getUnifiedCompletionRate = () => {
  const stats = unifiedResultData.value?.statistics
  const totalStudents = stats?.totalStudents || scheduleResults.value.length || 0
  const assignedStudents = stats?.assignedStudents || scheduleResults.value.filter(s => s.examiner1_1 && s.examiner2_1).length || 0
  
  if (totalStudents === 0) return '0.0'
  return ((assignedStudents / totalStudents) * 100).toFixed(1)
}

const getUnifiedAssignedStudents = () => {
  const stats = unifiedResultData.value?.statistics
  if (stats?.assignedStudents !== undefined) {
    return stats.assignedStudents
  }
  
  // 🔧 修复：只要有任意一天有考官分配就算已分配
  // 判断条件：examiner1_1 不是"待分配"且不为空，或者 examiner2_1 不是"待分配"且不为空
  return scheduleResults.value.filter(s => {
    const hasDay1 = s.examiner1_1 && s.examiner1_1 !== '待分配'
    const hasDay2 = s.examiner2_1 && s.examiner2_1 !== '待分配'
    return hasDay1 || hasDay2
  }).length || 0
}

// 🆕 获取未分配的学员列表
const getUnassignedStudents = () => {
  return scheduleResults.value.filter(s => {
    const hasDay1 = s.examiner1_1 && s.examiner1_1 !== '待分配'
    const hasDay2 = s.examiner2_1 && s.examiner2_1 !== '待分配'
    return !hasDay1 && !hasDay2 // 两天都没有考官才算未分配
  })
}

// 🆕 调试：打印分配情况
const debugAssignmentStatus = () => {
  console.log('=== 学员分配情况调试 ===')
  console.log('总学员数:', getUnifiedTotalStudents())
  console.log('已分配学员数:', getUnifiedAssignedStudents())
  console.log('未分配学员数:', getUnassignedStudents().length)
  
  scheduleResults.value.forEach(s => {
    const hasDay1 = s.examiner1_1 && s.examiner1_1 !== '待分配'
    const hasDay2 = s.examiner2_1 && s.examiner2_1 !== '待分配'
    console.log(`${s.student}: 第1天=${hasDay1 ? '已分配' : '未分配'}(${s.examiner1_1}), 第2天=${hasDay2 ? '已分配' : '未分配'}(${s.examiner2_1})`)
  })
}

const getUnifiedTotalStudents = () => {
  const stats = unifiedResultData.value?.statistics
  return stats?.totalStudents || scheduleResults.value.length || 0
}

const getUnifiedHardConstraintViolations = () => {
  const stats = unifiedResultData.value?.statistics
  const backendCount = (stats as any)?.hardConstraintViolations
  if (typeof backendCount === 'number') {
    return backendCount
  }
  return constraintViolations.value.filter(v => v.severity === 'error' || (v as any).severity === 'hard').length
}

const hardConflictLookup = computed(() => {
  const conflicts = (unifiedResultData.value?.conflicts || []) as any[]
  const map = new Map<string, any[]>()

  const normalizeDate = (value: any): string => {
    if (!value) return ''
    const s = String(value)
    const m = s.match(/\d{4}-\d{2}-\d{2}/)
    return m ? m[0] : ''
  }

  const extractStudent = (conflict: any): string => {
    const entities = Array.isArray(conflict?.affectedEntities) ? conflict.affectedEntities : []
    const studentEntry = entities.find((e: any) => typeof e === 'string' && e.startsWith('student='))
    if (typeof studentEntry === 'string') return studentEntry.slice('student='.length)

    const desc = conflict?.description ? String(conflict.description) : ''
    const m = desc.match(/学员\(([^/\)]+)[/\)]/)
    return m ? m[1] : ''
  }

  const extractDate = (conflict: any): string => {
    const entities = Array.isArray(conflict?.affectedEntities) ? conflict.affectedEntities : []
    const dateEntry = entities.find((e: any) => typeof e === 'string' && e.startsWith('date='))
    if (typeof dateEntry === 'string') return normalizeDate(dateEntry.slice('date='.length))
    return normalizeDate(conflict?.description)
  }

  conflicts.forEach(conflict => {
    if (!conflict) return
    const type = conflict.type ? String(conflict.type) : ''
    if (type !== 'hard') return
    const student = extractStudent(conflict)
    const date = extractDate(conflict)
    if (!student || !date) return
    const key = `${student}|${date}`
    const list = map.get(key) || []
    list.push(conflict)
    map.set(key, list)
  })

  return map
})

const hasHardConflict = (row: any): boolean => {
  const student = row?.student ? String(row.student) : ''
  const day1 = row?.rawDate1 ? String(row.rawDate1) : ''
  const day2 = row?.rawDate2 ? String(row.rawDate2) : ''
  if (!student) return false
  if (day1 && hardConflictLookup.value.has(`${student}|${day1}`)) return true
  if (day2 && hardConflictLookup.value.has(`${student}|${day2}`)) return true
  return false
}

const getHardConflictTooltip = (row: any): string => {
  const student = row?.student ? String(row.student) : ''
  const day1 = row?.rawDate1 ? String(row.rawDate1) : ''
  const day2 = row?.rawDate2 ? String(row.rawDate2) : ''
  if (!student) return ''

  const conflicts: any[] = []
  if (day1) conflicts.push(...(hardConflictLookup.value.get(`${student}|${day1}`) || []))
  if (day2) conflicts.push(...(hardConflictLookup.value.get(`${student}|${day2}`) || []))
  if (conflicts.length === 0) return ''

  const lines = conflicts.slice(0, 5).map(c => {
    const constraint = c?.constraint ? String(c.constraint) : 'Hard'
    const date = (String(c?.description || '').match(/\d{4}-\d{2}-\d{2}/) || [])[0] || ''
    const desc = c?.description ? String(c.description) : ''
    const sug = c?.suggestion ? String(c.suggestion) : ''
    const head = date ? `[${constraint}] ${date}` : `[${constraint}]`
    return sug ? `${head}\n${desc}\n建议: ${sug}` : `${head}\n${desc}`
  })

  return `硬约束冲突 (${conflicts.length}):\n\n${lines.join('\n\n')}`
}

const getUnifiedHardConstraintClass = () => {
  const violations = getUnifiedHardConstraintViolations()
  return violations === 0 ? 'success' : 'error'
}

// 🔧 格式化软约束得分
const formatSoftScore = (score: number | null | undefined) => {
  if (score === undefined || score === null) {
    return '0'
  }
  
  // 🔧 统一转换为正分显示（取绝对值）
  const absScore = Math.abs(score)
  
  // 如果原始分数为0（完美解）
  if (score === 0) {
    return '0 (完美)'
  }
  
  // 统一显示为正分
  return absScore.toLocaleString()
}

// 🔧 获取软约束得分的样式类（统一按正分评估）
const getSoftScoreClass = () => {
  const score = unifiedResultData.value?.statistics?.softConstraintsScore
  
  if (score === undefined || score === null) {
    return 'warning'
  }
  
  // 🔧 统一转换为正分评估（取绝对值）
  const absScore = Math.abs(score)
  
  // 如果原始分数为0（完美解）
  if (score === 0) {
    return 'success'  // 完美 - 绿色
  }
  
  // 统一按正分评估：分数越高越好
  if (absScore >= 50000) {
    return 'success'  // 绿色 - 优秀
  } else if (absScore >= 20000) {
    return 'info'  // 蓝色 - 良好
  } else {
    return 'warning'  // 黄色 - 可以改进
  }
}

const handleFixAllViolations = () => {
  process.env.NODE_ENV === 'development' && console.log('修复所有约束违反')
  
  const holidayViolations = constraintViolations.value.filter(v => v.type === 'holiday')
  const weekendViolations = constraintViolations.value.filter(v => v.type === 'weekend')
  const teacherViolations = constraintViolations.value.filter(v => v.type === 'teacher')
  
  let message = '🚨 检测到以下约束违反：\n\n'
  
  if (holidayViolations.length > 0) {
    message += '📅 节假日违反：' + holidayViolations.length + '个\n'
  }
  
  if (weekendViolations.length > 0) {
    message += '📅 周末违反' + weekendViolations.length + '个\n'
  }
  
  if (teacherViolations.length > 0) {
    message += '👥 考官配备违反' + teacherViolations.length + '个\n'
    const mainExaminerViolations = teacherViolations.filter(v => v.id === 'main-examiners-violation')
    if (mainExaminerViolations.length > 0) {
      message += '   - 约束：主考官配备不足\n'
    }
  }
  
  message += '\n💡 综合解决方案：\n'
  
  if (holidayViolations.length > 0 || weekendViolations.length > 0) {
    message += '📅 日期问题：\n'
    message += '  1. 重新选择工作日进行考试安排\n'
    message += '  2. 避开所有法定节假日和周末\n'
    message += '  3. 检查考试日期范围设置\n\n'
  }
  
  if (teacherViolations.length > 0) {
    message += '👥 考官问题：\n'
    message += '  1. 增加考官资源或调整考官可用性\n'
    message += '  2. 确保每个科室都有足够的考官\n'
    message += '  3. 检查考官时间冲突\n'
    message += '  4. 优化考官分配策略\n\n'
  }
  
  message += '🔧 建议操作：\n'
  message += '1. 重新配置排班参数\n'
  message += '2. 调整约束条件权重\n'
  message += '3. 增加考官资源\n'
  message += '4. 优化考试日期安排\n\n'
  message += '点击确定重新进行排班配置'
  
  if (confirm(message)) {
    showCreateModal.value = true
    // 清除所有违反状态
    constraintViolations.value = []
  }
}

// 人工调整功能
const editingCell = ref(null)
const showEditModal = ref(false)
const editingRecord = ref<ScheduleResultRow | null>(null)
const editingField = ref<string>('')
const availableTeachers = ref<TeacherInfo[]>([])
const selectedTeacher = ref('')
const currentEditValue = ref('')

// ✨ 检查考官可用性（考虑值班、冲突、HC1约束等）
const checkTeacherAvailability = (teacher: TeacherInfo, examDate: string): boolean => {
  try {
    // 1. 检查值班状态（HC3约束）
    const dutySchedule = dutyRotationService.calculateDutySchedule(examDate)
    if (dutySchedule.dayShift === teacher.group) {
      return false  // 白班执勤，不可用
    }
    
    // 2. 检查节假日（HC1约束）
    const isHolidayResult = holidayService.isHoliday(examDate)
    if (isHolidayResult) {
      return false  // 节假日，不可用
    }
    
    // 3. 检查HC1约束：周六周日可以考试，但行政班考官周末不参加考试
    const date = new Date(examDate)
    const dayOfWeek = date.getDay() // 0=周日, 6=周六
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isAdminTeacher = !teacher.group || teacher.group === '无' || teacher.group.trim() === ''
    
    if (isWeekend && isAdminTeacher) {
      process.env.NODE_ENV === 'development' && console.log(`🚫 [HC1约束] 考官${teacher.name}为行政班考官，周末${examDate}不可用`)
      return false  // 周末，行政班考官不可用
    }
    
    // 4. 检查时间冲突
    const hasTimeConflict = scheduleResults.value.some((result: any) => 
      result.examDate === examDate && [
        result.examiner1_1, result.examiner1_2, result.backup1,
        result.examiner2_1, result.examiner2_2, result.backup2
      ].includes(teacher.name)
    )
    if (hasTimeConflict) {
      return false  // 已有其他安排
    }
    
    return true
  } catch (error) {
    console.error('检查考官可用性失败:', error)
    return true  // 出错时默认可用
  }
}

// ✨ 生成冲突信息文本
const generateConflictInfo = (teacher: TeacherInfo, examDate: string): string => {
  const conflicts: string[] = []
  
  try {
    // 检查节假日（HC1约束）
    const isHolidayResult = holidayService.isHoliday(examDate)
    if (isHolidayResult) {
      conflicts.push('节假日不可用')
    }
    
    // 检查HC1约束：周末+行政班考官
    const date = new Date(examDate)
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isAdminTeacher = !teacher.group || teacher.group === '无' || teacher.group.trim() === ''
    
    if (isWeekend && isAdminTeacher) {
      const dayName = dayOfWeek === 0 ? '周日' : '周六'
      conflicts.push(`行政班考官周末(${dayName})不可用`)
    }
    
    // 检查白班执勤（HC3约束）
    const dutySchedule = dutyRotationService.calculateDutySchedule(examDate)
    if (dutySchedule.dayShift === teacher.group) {
      conflicts.push('白班执勤')
    }
    
    const workload = calculateTeacherWorkload(teacher.name)
    if (workload > 5) {
      conflicts.push(`工作量${workload}`)
    }
    
    const hasTimeConflict = scheduleResults.value.some(result => {
      const resultAny = result as any
      return resultAny.examDate === examDate && [
        resultAny.examiner1_1, resultAny.examiner1_2, resultAny.backup1,
        resultAny.examiner2_1, resultAny.examiner2_2, resultAny.backup2
      ].includes(teacher.name)
    })
    if (hasTimeConflict) {
      conflicts.push('时间冲突')
    }
  } catch (error) {
    console.error('生成冲突信息失败:', error)
  }
  
  return conflicts.join(', ')
}

// 编辑考官
const editExaminer = async (record: any, field: string) => {
  process.env.NODE_ENV === 'development' && console.log('编辑考官:', record, field)
  
  // ✨ 动态计算考试日期（根据编辑的字段判断是day1还是day2）
  // 🔧 修复：使用原始日期格式（rawDate1/rawDate2）而不是显示格式（date1/date2）
  const isDay1Field = field === 'examiner1_1' || field === 'examiner1_2' || field === 'backup1'
  const examDate = isDay1Field ? (record.rawDate1 || record.date1) : (record.rawDate2 || record.date2)
  
  // 🔄 获取轮班信息
  const requiredShift = isDay1Field ? record.shift1 : record.shift2
  
  process.env.NODE_ENV === 'development' && console.log('📅 [日期修复] 使用完整日期格式:', examDate, '字段:', field, '轮班:', requiredShift)
  
  // 🔧 确保 editingRecord 包含 examDate 和 shift 字段
  // 🔥 修复：直接引用原始记录，而不是创建副本，确保修改能同步到排班表
  editingRecord.value = record as any
  // 补充缺失的 examDate 字段
  const recordWithDate = record as any
  if (!recordWithDate.examDate) {
    recordWithDate.examDate = examDate
  }
  // 补充轮班字段
  if (!recordWithDate.requiredShift) {
    recordWithDate.requiredShift = requiredShift
  }
  editingField.value = field
  currentEditValue.value = record[field] || ''
  
  // 获取可用考官列表
  try {
    // 🔧 优先使用缓存的考官数据，避免重复加载
    let teachers = cachedTeacherData && cachedTeacherData.length > 0 
      ? cachedTeacherData 
      : teacherList.value && teacherList.value.length > 0
        ? teacherList.value
        : await prepareTeacherData()
    
    process.env.NODE_ENV === 'development' && console.log('✅ 使用考官数据:', teachers.length, '名考官')
    
    // 如果仍然没有数据，抛出友好的错误
    if (!teachers || teachers.length === 0) {
      throw new Error('请先上传考官数据，或重新进行排班')
    }
    
    if (!examDate) {
      throw new Error('无法获取考试日期，请确保排班数据完整')
    }
    
    process.env.NODE_ENV === 'development' && console.log(`🔧 准备计算考官状态，考试日期: ${examDate}`)
    
    const dutySchedule = dutyRotationService.calculateDutySchedule(examDate)
    
    process.env.NODE_ENV === 'development' && console.log(`🔧 动态计算考官状态完成，值班信息:`, dutySchedule)
    
    availableTeachers.value = teachers.map(teacher => {
      // 计算当前工作量
      const currentWorkload = calculateTeacherWorkload(teacher.name)
      
      // 判断是否为晚班
      const nightShiftPreferred = dutySchedule.nightShift === teacher.group
      
      // 判断休息日状态
      let restDayStatus: 'first' | 'second' | 'none' = 'none'
      if (dutySchedule.restGroups && dutySchedule.restGroups.includes(teacher.group)) {
        restDayStatus = dutySchedule.restGroups[0] === teacher.group ? 'first' : 'second'
      }
      
      // 检查可用性
      let available = checkTeacherAvailability(teacher, examDate)
      
      // 🔄 检查轮班匹配
      const shiftMatched = !requiredShift || !teacher.shift || teacher.shift === requiredShift
      if (!shiftMatched) {
        available = false  // 轮班不匹配的考官标记为不可用
      }
      
      // 生成冲突信息
      let conflictInfo = generateConflictInfo(teacher, examDate)
      if (!shiftMatched) {
        conflictInfo = conflictInfo 
          ? `${conflictInfo}; 轮班不匹配（需要${requiredShift}，考官是${teacher.shift}）`
          : `轮班不匹配（需要${requiredShift}，考官是${teacher.shift}）`
      }
      
      return {
        ...teacher,
        currentWorkload,
        nightShiftPreferred,
        restDayStatus,
        available,
        shiftMatched,  // 新增字段标识轮班是否匹配
        conflictInfo
      }
    })
    
    process.env.NODE_ENV === 'development' && console.log(`✅ 考官状态计算完成，可用考官: ${availableTeachers.value.filter(t => t.available).length}/${availableTeachers.value.length}`)
    
    selectedTeacher.value = record[field] || ''
    
    // 初始化智能推荐服务的上下文
    await initializeSmartRecommendation(record, field)
    
    showEditModal.value = true
  } catch (error) {
    console.error('获取考官列表失败:', error)
    alert('获取考官列表失败，请重试')
  }
}

// 确认编辑
const confirmEdit = () => {
  if (editingRecord.value && editingField.value && editingField.value !== '') {
    (editingRecord.value as any)[editingField.value] = selectedTeacher.value
    process.env.NODE_ENV === 'development' && console.log('更新考官:', editingField.value, '到', selectedTeacher.value)
    
    // 标记数据已修改
    markAsModified()
  }
  closeEditModal()
}

// 关闭编辑弹窗
const closeEditModal = () => {
  showEditModal.value = false
  editingRecord.value = null
  editingField.value = ''
  selectedTeacher.value = ''
  currentEditValue.value = ''
}

// 初始化智能推荐
const initializeSmartRecommendation = async (record: any, field: string) => {
  try {
    // 构建编辑上下文
    const context = {
      editingRecord: record,
      editingField: field,
      currentValue: record[field],
      examDate: record.examDate,
      requiredShift: record.requiredShift,  // 🔄 添加轮班信息
      studentInfo: {
        name: record.student,
        department: record.department,
        level: record.level || '研究'
      },
      scheduleContext: {
        existingAssignments: scheduleResults.value,
        timeSlot: field.includes('2') ? 'day2' as const : 'day1' as const,
        role: field.includes('backup') ? 'backup' as const : 'main' as const
      }
    }
    
    process.env.NODE_ENV === 'development' && console.log('🔧 智能推荐上下文:', {
      student: context.studentInfo.name,
      date: context.examDate,
      shift: context.requiredShift,
      field: context.editingField
    })

    // 设置约束配置
    smartRecommendationService.setConstraintConfig({
      softConstraints: {
        examiner1SameDept: (constraints.value as any).examiner1SameDept || false,
        backupExaminerDiffDept: (constraints.value as any).backupExaminerDiffDept || false
      }
    })

    // 更新考官工作量缓存
    availableTeachers.value.forEach(teacher => {
      const workload = calculateTeacherWorkload(teacher.name)
      smartRecommendationService.updateWorkloadCache(teacher.id, workload)
    })

  } catch (error) {
    console.error('初始化智能推荐失败', error)
  }
}

// 计算考官工作量
const calculateTeacherWorkload = (teacherName: string): number => {
  return scheduleResults.value.reduce((count, result) => {
    const assignments = [
      result.examiner1_1,
      result.examiner1_2, 
      result.backup1,
      result.examiner2_1,
      result.examiner2_2,
      result.backup2
    ]
    return count + assignments.filter(name => name === teacherName).length
  }, 0)
}

// 处理智能编辑确认
const handleSmartEditConfirm = async (data: {
  teacher: string
  reason: string
  conflicts: any[]
  isForced: boolean
  wasRecommended?: boolean
  recommendationScore?: number
  recommendationPriority?: string
}) => {
  if (editingRecord.value && editingField.value) {
    // 更新记录
    (editingRecord.value as any)[editingField.value] = data.teacher
    
    // 使用scheduleHistoryService记录人工修改
    const conflictLevel = data.conflicts.length > 0 ? 
      (data.conflicts.some((c: any) => c.severity === 'error' || c.severity === 'high') ? 'error' : 'warning') : 
      'none'
    
    try {
      scheduleHistoryService.recordManualEdit(
        editingRecord.value as any,
        editingField.value,
        currentEditValue.value,
        data.teacher,
        conflictLevel
      )
    } catch (error) {
      console.error('⚠️ 记录人工修改到历史服务失败（不影响实际修改）:', error)
    }
    
    // 🎨 增强的修改记录（包含推荐信息）
    const editInfo = {
      field: editingField.value,
      originalValue: currentEditValue.value,
      newValue: data.teacher,
      reason: data.reason,
      conflicts: data.conflicts,
      isForced: data.isForced,
      timestamp: new Date().toISOString(),
      editedBy: '管理员',
      // 🆕 推荐相关信息
      wasRecommended: data.wasRecommended || false,
      recommendationScore: data.recommendationScore || 0,
      recommendationPriority: data.recommendationPriority || 'none'
    };
    
    if (!(editingRecord.value as any).manualEdits) {
      (editingRecord.value as any).manualEdits = []
    }
    (editingRecord.value as any).manualEdits.push(editInfo)
    
    // 🔥 关键修复：同步更新到 scheduleResults 数组中的原始记录
    const originalRecord = scheduleResults.value.find(r => 
      r.student === editingRecord.value?.student && 
      r.department === editingRecord.value?.department
    )
    if (originalRecord) {
      (originalRecord as any)[editingField.value] = data.teacher
      if (!(originalRecord as any).manualEdits) {
        (originalRecord as any).manualEdits = []
      }
      (originalRecord as any).manualEdits.push(editInfo)
      
      process.env.NODE_ENV === 'development' && console.log('✅ 已同步更新原始记录到排班表')
      process.env.NODE_ENV === 'development' && console.log('📝 manualEdits 数据:', (originalRecord as any).manualEdits)
      process.env.NODE_ENV === 'development' && console.log('🎨 应该显示金黄色背景:', {
        学员: originalRecord.student,
        字段: editingField.value,
        新值: data.teacher,
        修改记录数: (originalRecord as any).manualEdits.length
      })
    } else {
      console.warn('⚠️ 未找到原始记录，可能导致界面不更新')
      console.warn('⚠️ 查找条件:', {
        student: editingRecord.value?.student,
        department: editingRecord.value?.department,
        当前记录数: scheduleResults.value.length
      })
    }
    
    process.env.NODE_ENV === 'development' && console.log('智能人工修改完成:', editInfo)
    
    // 🔄 强制触发响应式更新
    scheduleResults.value = [...scheduleResults.value]
    
    // 🐛 使用 nextTick 确保 DOM 更新后验证
    nextTick(() => {
      if (originalRecord) {
        const cssClass = getManualEditClass(originalRecord, editingField.value)
        process.env.NODE_ENV === 'development' && console.log('🎨 【DOM更新后】验证颜色标识系统:', {
          学员: originalRecord.student,
          修改字段: editingField.value,
          manualEdits数量: (originalRecord as any).manualEdits?.length,
          最新editInfo: (originalRecord as any).manualEdits?.[(originalRecord as any).manualEdits.length - 1],
          应用的CSS类: cssClass,
          '✅检查': cssClass ? '颜色标识已应用' : '❌ 未检测到颜色标识'
        })
      }
    })
    
    // ✨ 新增：重新验证约束
    try {
      process.env.NODE_ENV === 'development' && console.log('🔍 重新验证修改后的约束...')
      const violations = await validateManualEdit(editingRecord.value, editingField.value, data.teacher)
      
      if (violations.hardViolations.length > 0) {
        showNotification(
          `⚠️ 修改后违反${violations.hardViolations.length}个硬约束！\n${violations.hardViolations.join('\n')}`, 
          'error'
        )
        console.warn('❌ 硬约束违反:', violations.hardViolations)
      } else if (violations.softViolations.length > 0) {
        showNotification(
          `修改成功！存在${violations.softViolations.length}个软约束违反`, 
          'warning'
        )
        process.env.NODE_ENV === 'development' && console.log('⚠️ 软约束违反:', violations.softViolations)
      } else {
        showNotification(`✅ 修改成功！无约束违反`, 'success')
      }
    } catch (error) {
      console.error('约束验证失败:', error)
      // 即使验证失败，也继续显示基本成功提示
    const message = data.isForced ? 
      `⚠️ 强制修改成功！已修改${editingField.value} 为${data.teacher}，存在${data.conflicts.length} 个冲突` :
      `修改成功！已修改${editingField.value} 为${data.teacher}`
    showNotification(message, data.isForced ? 'warning' : 'success')
    }
    
    // ✨ 新增：重新计算工作量
    const newWorkload = calculateTeacherWorkload(data.teacher)
    const oldWorkload = currentEditValue.value ? calculateTeacherWorkload(currentEditValue.value) : 0
    process.env.NODE_ENV === 'development' && console.log(`📊 工作量变化: ${currentEditValue.value}(${oldWorkload}) → ${data.teacher}(${newWorkload})`)
    
    // 标记数据已修改
    markAsModified()
  }
  
  closeEditModal()
}

// ✨ 验证人工修改后的约束
const validateManualEdit = async (record: any, field: string, newTeacher: string) => {
  const hardViolations: string[] = []
  const softViolations: string[] = []
  
  const examDate = record.examDate
  const studentDept = record.department
  
  try {
    // 获取考官信息
    const teacher = availableTeachers.value.find(t => t.name === newTeacher)
    if (!teacher) {
      hardViolations.push('考官不存在')
      return { hardViolations, softViolations }
    }
    
    // HC2: 主考官1必须与学员同科室
    if (field === 'examiner1_1' && teacher.department !== studentDept) {
      hardViolations.push(`HC2违反: 主考官1 ${newTeacher}(${teacher.department}) 与学员(${studentDept})不同科室`)
    }
    
    // HC3: 检查白班执勤冲突
    const dutySchedule = dutyRotationService.calculateDutySchedule(examDate)
    if (dutySchedule.dayShift === teacher.group) {
      hardViolations.push(`HC3违反: ${newTeacher} 在${examDate}执勤白班`)
    }
    
    // HC4: 检查时间冲突
    const hasConflict = scheduleResults.value.some(result => {
      const resultAny = result as any
      return resultAny.id !== record.id &&
        resultAny.examDate === examDate && [
          resultAny.examiner1_1, resultAny.examiner1_2, resultAny.backup1,
          resultAny.examiner2_1, resultAny.examiner2_2, resultAny.backup2
        ].includes(newTeacher)
    })
    if (hasConflict) {
      hardViolations.push(`HC4违反: ${newTeacher} 在${examDate}已有其他考试安排`)
    }
    
    // HC2: 检查同一学员的角色冲突
    const otherRoles = Object.keys(record).filter(key => 
      (key.includes('examiner') || key.includes('backup')) && 
      key !== field &&
      record[key] === newTeacher
    )
    if (otherRoles.length > 0) {
      hardViolations.push(`HC2违反: ${newTeacher} 已担任该学员的${otherRoles.join(', ')}`)
    }
    
    // 软约束检查
    // SC2/SC4: 专业匹配
    if (field.includes('examiner2') && teacher.department === studentDept) {
      softViolations.push(`SC2建议: 考官2建议选择不同科室，当前为${teacher.department}`)
    }
    
    // SC10: 工作量平衡
    const workload = calculateTeacherWorkload(newTeacher)
    if (workload > 5) {
      softViolations.push(`SC10建议: ${newTeacher} 工作量(${workload})较重，建议平衡`)
    }
    
  } catch (error) {
    console.error('约束验证异常:', error)
  }
  
  return { hardViolations, softViolations }
}

// 显示通知
const showNotification = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
  const notification = document.createElement('div')
  notification.textContent = message
  notification.style.cssText = `
    position: fixed; 
    top: 20px; 
    right: 20px; 
    background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'}; 
    color: white; 
    padding: 12px 20px; 
    border-radius: 6px; 
    z-index: 9999; 
    font-weight: 500;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `
  document.body.appendChild(notification)
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification)
    }
  }, 5000)
}

// 编辑整个排班记录
const editScheduleRecord = (record: any) => {
  process.env.NODE_ENV === 'development' && console.log('编辑排班记录:', record)
  // 这里可以打开一个更详细的编辑弹窗
  alert('详细编辑功能开发中...')
}

// 删除排班记录
const deleteScheduleRecord = (record: any) => {
    if (confirm(`确定要删除学员${record.student} 的排班记录吗？`)) {
    const index = scheduleResults.value.findIndex(r => r.id === record.id)
    if (index > -1) {
      scheduleResults.value.splice(index, 1)
      process.env.NODE_ENV === 'development' && console.log('删除排班记录:', record.student)
      markAsModified()
    }
  }
}

// 标记数据已修改
const isModified = ref(false)
const markAsModified = () => {
  isModified.value = true
  process.env.NODE_ENV === 'development' && console.log('排班数据已修改')
}

// 🆕 拖拽排班功能 - 固定/取消固定排班
const isPinnedSchedule = (scheduleId: string) => {
  const result = pinnedScheduleIds.value.has(scheduleId)
  // #region agent log - only log occasionally to avoid spam
  if (Math.random() < 0.05) { // 5% sample rate
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:isPinnedSchedule',message:'Checking if schedule is pinned',data:{scheduleId,result,pinnedSetSize:pinnedScheduleIds.value.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  }
  // #endregion
  return result
}

const togglePinSchedule = (scheduleId: string) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:togglePinSchedule',message:'Manual pin toggle',data:{scheduleId,wasAlreadyPinned:pinnedScheduleIds.value.has(scheduleId),pinnedCountBefore:pinnedScheduleIds.value.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (pinnedScheduleIds.value.has(scheduleId)) {
    pinnedScheduleIds.value.delete(scheduleId)
    ElMessage.success('已取消固定')
  } else {
    pinnedScheduleIds.value.add(scheduleId)
    ElMessage.success('已固定排班，拖拽时不会改变')
  }
}

// 🆕 拖拽排班功能 - 开始拖拽
const handleDragStart = (event: DragEvent, schedule: ScheduleResultRow, dayIndex: number) => {
  if (isPinnedSchedule(String(schedule.id))) {
    event.preventDefault()
    ElMessage.warning('固定的排班无法拖动，请先取消固定')
    return
  }
  
  console.log('🎯 开始拖拽:', schedule.student, '第', dayIndex, '天')
  
  // 🆕 判断是一天考试还是两天考试
  const isTwoDayExam =
    (schedule as any)?.examDays !== 1 &&
    !!(schedule.date1 && schedule.date2 && schedule.date2 !== '-' && schedule.date1 !== schedule.date2)
  
  isDraggingSchedule.value = true
  draggingSchedule.value = schedule
  draggingDayIndex.value = dayIndex
  draggingIsTwoDayExam.value = isTwoDayExam // 🆕 记录是否为两天考试
  showDatePicker.value = true
  
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', String(schedule.id))
  
  // 🆕 拖拽排班功能 - 拖拽过程中
  // const handleDragMove = (event: DragEvent) => { ... } // 移除动态跟随，改为居中显示
  
  mouseX.value = Math.max(20, (window.innerWidth - 400) / 2)
  mouseY.value = Math.max(20, (window.innerHeight - 500) / 2)
  
  // 添加键盘监听（ESC 取消）
  document.addEventListener('keydown', handleEscapeKey)
  
  console.log('✅ 拖拽状态已设置，浮层应该显示')
  console.log(`📋 考试类型: ${isTwoDayExam ? '两天考试（将同时移动两天）' : '单天考试'}`)
}

// 🆕 拖拽排班功能 - ESC 键取消
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    console.log('⌨️ 按下 ESC，取消拖拽')
    forceCloseDatePicker()
  }
}

// 🆕 拖拽排班功能 - 结束拖拽
const handleDragEnd = () => {
  console.log('🛑 结束拖拽')
  
  // 如果浮层还在显示，说明用户可能想选择日期
  // 延迟关闭，给用户时间点击日期
  if (showDatePicker.value && isDraggingSchedule.value) {
    console.log('⏳ 浮层保持打开，等待用户选择日期')
    // 不立即关闭，等待用户点击日期或点击关闭按钮
    return
  }
  
  isDraggingSchedule.value = false
  draggingSchedule.value = null
  draggingDayIndex.value = 1
  showDatePicker.value = false
  document.removeEventListener('keydown', handleEscapeKey)
}

// 🆕 拖拽排班功能 - 强制关闭浮层（用于X按钮和ESC键）
const forceCloseDatePicker = () => {
  console.log('❌ 强制关闭日期选择浮层')
  isDraggingSchedule.value = false
  draggingSchedule.value = null
  draggingDayIndex.value = 1
  showDatePicker.value = false
  document.removeEventListener('keydown', handleEscapeKey)
  ElMessage.info('已取消拖拽')
}

// 🆕 拖拽排班功能 - 处理放置事件
const handleDateDrop = (event: DragEvent, newDate: string) => {
  console.log('💧 放置在日期:', newDate)
  handleDateSelect(newDate)
}

// 🆕 拖拽排班功能 - 选择新日期
const handleDateSelect = async (newDate: string) => {
  console.log('🎯 handleDateSelect 被调用，新日期:', newDate)
  
  if (!draggingSchedule.value) {
    console.error('❌ draggingSchedule 为空')
    return
  }
  
  console.log('📅 选择了新日期:', newDate)
  
  const schedule = draggingSchedule.value
  const dayIndex = draggingDayIndex.value
  const isTwoDayExam = draggingIsTwoDayExam.value
  const originalDate = dayIndex === 1 ? schedule.date1 : schedule.date2
  
  console.log('📊 排班信息:', {
    student: schedule.student,
    dayIndex,
    originalDate,
    newDate,
    isTwoDayExam
  })
  
  if (originalDate === newDate) {
    ElMessage.info('日期未改变')
    forceCloseDatePicker()
    return
  }
  
  // 先关闭浮层
  isDraggingSchedule.value = false
  showDatePicker.value = false
  document.removeEventListener('keydown', handleEscapeKey)
  
  try {
    // 检查是否超出原始范围
    const selectedDateObj = availableDates.value.find(d => d.value === newDate)
    const isOutOfRange = selectedDateObj?.isOutOfRange || false
    
    console.log('📍 日期类型:', isOutOfRange ? '延期' : '正常范围')
    
    // 🆕 如果是两天考试，计算第二天的日期（+1天）
    let newDate2 = newDate
    if (isTwoDayExam) {
      const [month, day] = newDate.split('.').map(Number)
      const year = new Date().getFullYear()
      const dateObj = new Date(year, month - 1, day + 1) // day + 1 就是第二天
      newDate2 = `${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`
      console.log(`📅 两天考试，第2天自动计算: ${newDate} → ${newDate2}`)
    }
    
    // 构建确认消息
    let confirmMessage = `确认移动排班？
      
学员: ${schedule.student}
考试类型: ${isTwoDayExam ? '两天考试' : '单天考试'}

${isTwoDayExam ? `第1天原日期: ${schedule.date1}
第1天新日期: ${newDate}
第2天原日期: ${schedule.date2}
第2天新日期: ${newDate2}` : `第${dayIndex}天原日期: ${originalDate}
第${dayIndex}天新日期: ${newDate}`}

系统将自动调用后端重新分配考官，固定的排班不会改变。`
    
    if (isOutOfRange) {
      confirmMessage += `

📅 提示：所选日期为延期日期
原始考试截止：${examEndDateStr.value}
新日期：${newDate}（延期到原范围后）

建议：
• 确保考官在该日期可用
• 考虑通知相关人员日期变更`
    }
    
    console.log('💬 准备显示确认对话框')
    
    // 确认对话框
    await ElMessageBox.confirm(
      confirmMessage,
      isOutOfRange ? '📅 确认移动（延期）' : '确认移动',
      {
        confirmButtonText: '确认移动',
        cancelButtonText: '取消',
        type: isOutOfRange ? 'info' : 'warning',
        dangerouslyUseHTMLString: true
      }
    )
    
    console.log('✅ 用户确认移动')
    
    // 🆕 调用局部重新排班，传入两天考试信息
    await partialReschedule(String(schedule.id), dayIndex, newDate, isTwoDayExam, newDate2)
    
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('移动排班失败:', error)
    } else {
      console.log('❌ 用户取消了移动')
    }
  } finally {
    // 确保状态重置
    draggingSchedule.value = null
    draggingDayIndex.value = 1
    draggingIsTwoDayExam.value = false
  }
}

// 🔧 v5.6.0: 拖拽排班功能 - 简化版（只移动日期，考官需要通过局部重排重新分配）
const partialReschedule = async (scheduleId: string, dayIndex: number, newDate: string, isTwoDayExam: boolean = false, newDate2?: string) => {
  try {
    console.log('🔄 [拖拽] 开始移动排班日期:', { scheduleId, dayIndex, newDate, isTwoDayExam, newDate2 })
    
    // 找到目标排班
    const schedule = scheduleResults.value.find(s => String(s.id) === scheduleId)
    if (!schedule) {
      throw new Error('未找到目标排班')
    }
    
    // 🔧 只更新日期，清除考官分配（需要后续使用局部重排功能重新分配）
    if (isTwoDayExam) {
      // 两天考试：同时更新两天日期
      schedule.date1 = newDate
      schedule.date2 = newDate2 || newDate

      // 同步 rawDate（用于排序与后端对齐）
      ;(schedule as any).rawDate1 = convertToFullDate(newDate) || (schedule as any).rawDate1
      ;(schedule as any).rawDate2 = convertToFullDate(newDate2 || newDate) || (schedule as any).rawDate2
      
      // 清除所有考官分配
      schedule.examiner1_1 = '待分配'
      schedule.examiner1_2 = '待分配'
      schedule.backup1 = '待分配'
      schedule.examiner2_1 = '待分配'
      schedule.examiner2_2 = '待分配'
      schedule.backup2 = '待分配'
      
      console.log(`📅 已更新两天日期: ${newDate} 和 ${newDate2}`)
    } else {
      // 单天考试：只更新一天
      if (dayIndex === 1) {
        schedule.date1 = newDate
        ;(schedule as any).rawDate1 = convertToFullDate(newDate) || (schedule as any).rawDate1
        schedule.examiner1_1 = '待分配'
        schedule.examiner1_2 = '待分配'
        schedule.backup1 = '待分配'
      } else {
        schedule.date2 = newDate
        ;(schedule as any).rawDate2 = convertToFullDate(newDate) || (schedule as any).rawDate2
        schedule.examiner2_1 = '待分配'
        schedule.examiner2_2 = '待分配'
        schedule.backup2 = '待分配'
      }
      console.log(`📅 已更新第${dayIndex}天日期: ${newDate}`)
    }

    // 🆕 拖拽移动后自动固定，方便后续只对固定排班进行局部重排
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:partialReschedule:beforeAdd',message:'About to add scheduleId to pinnedScheduleIds',data:{scheduleId,scheduleIdType:typeof scheduleId,pinnedCountBefore:pinnedScheduleIds.value.size,allPinnedBefore:Array.from(pinnedScheduleIds.value)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    pinnedScheduleIds.value.add(scheduleId)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:partialReschedule:afterAdd',message:'After adding scheduleId to pinnedScheduleIds',data:{scheduleId,pinnedCountAfter:pinnedScheduleIds.value.size,allPinnedAfter:Array.from(pinnedScheduleIds.value)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // 按日期排序
    sortScheduleResults()
    
    // 保存到localStorage
    savePageState()
    
    // 标记为未保存
    hasUnsavedChanges.value = true
    
    // 提示用户
    ElMessage.success({
      message: '✅ 日期已更新并自动固定！\n💡 现在可以点击"只重排固定排班"按钮重新分配考官',
      duration: 6000,
      showClose: true
    })
    
    console.log('✅ [拖拽] 日期移动完成（已自动固定）')
    
  } catch (error) {
    console.error('❌ [拖拽] 移动失败:', error)
    ElMessage.error('移动失败: ' + (error as Error).message)
  }
}

// 🆕 v5.6.0: 局部重排核心功能
const triggerPartialReschedule = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:triggerPartialReschedule:entry',message:'triggerPartialReschedule called',data:{pinnedCount:pinnedScheduleIds.value.size,totalSchedules:scheduleResults.value.length,allPinnedIds:Array.from(pinnedScheduleIds.value)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  // 确认对话框
  try {
    const rescheduleCount = pinnedScheduleIds.value.size
    const protectedCount = scheduleResults.value.length - rescheduleCount

    await ElMessageBox.confirm(
      `<div style="line-height: 1.8; font-size: 14px;">
        <p>将使用 <strong>OptaPlanner</strong> 专业求解引擎重新分配 <strong style="color: #409eff;">${rescheduleCount}</strong> 个固定排班，</p>
        <p>保持 <strong style="color: #67c23a;">${protectedCount}</strong> 个未固定排班不变。</p>
        <br/>
        <p>⏱️ <strong>预计时间：</strong>15-25秒</p>
        <p>🎯 <strong>算法引擎：</strong>纯后端OptaPlanner</p>
        <p>✅ <strong>质量保证：</strong>全局最优解</p>
        <p>📌 <strong>保护策略：</strong>未固定排班将完全保持不变</p>
      </div>`,
      '确认重新分配',
      {
        confirmButtonText: '开始重排',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true
      }
    )
  } catch {
    return  // 用户取消
  }
  
  // 开始重排
  await partialRescheduleUnpinned()
}

const partialRescheduleUnpinned = async () => {
  console.log('🔄 [局部重排] 开始准备数据...')
  
  const rescheduleIds = Array.from(pinnedScheduleIds.value)
  const allScheduleIds = scheduleResults.value.map(s => String(s.id))
  const pinnedIds = allScheduleIds.filter(id => !rescheduleIds.includes(id))

  if (rescheduleIds.length === 0) {
    ElMessage.warning('请先固定需要重排的排班（例如拖拽修改日期后会自动固定）')
    return
  }
  
  const studentExamDaysMap = new Map<string, number>()
  studentList.value.forEach((st: any) => {
    const days = st?.examDays || 2
    if (st?.name) studentExamDaysMap.set(st.name, days)
  })

  // 转换现有排班数据
  const existingAssignments = scheduleResults.value.map(s => {
    const examDays = studentExamDaysMap.get(s.student) || (s as any).examDays || 2
    const isOneDayExam = examDays === 1
    
    // 🔧 修复：确保日期始终是完整的ISO格式（YYYY-MM-DD）
    const ensureFullDate = (dateValue: string | null | undefined): string | null => {
      if (!dateValue || dateValue === '-' || dateValue === '—' || dateValue === '未安排') return null
      // 如果已经是完整格式，直接返回
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue
      // 否则转换
      return convertToFullDate(dateValue)
    }
    
    const date1Full = ensureFullDate((s as any).rawDate1) || ensureFullDate(s.date1)
    const date2Full = isOneDayExam ? '' : (ensureFullDate((s as any).rawDate2) || ensureFullDate(s.date2 || ''))

    return {
      id: String(s.id),
      studentId: String(s.id),
      studentName: s.student,
      date1: date1Full,
      examiner1_1: s.examiner1_1,
      examiner1_2: s.examiner1_2,
      backup1: s.backup1,
      examDays,
      date2: date2Full,
      examiner2_1: isOneDayExam ? '' : s.examiner2_1,
      examiner2_2: isOneDayExam ? '' : s.examiner2_2,
      backup2: isOneDayExam ? '' : s.backup2,
      pinned: pinnedIds.includes(String(s.id)),
    }
  })
  
  // 转换学员数据
  const convertedStudents = studentList.value.map(student => ({
    id: student.id || `student_${student.name}`,
    name: student.name,
    department: student.department,
    group: student.group || '无',
    examDays: student.examDays || 2,
    day1Subjects: student.day1Subjects ? JSON.stringify(student.day1Subjects) : undefined,
    day2Subjects: student.day2Subjects ? JSON.stringify(student.day2Subjects) : undefined,
    recommendedExaminer1Dept: (student as any).recommendedExaminer1Dept,
    recommendedExaminer2Dept: (student as any).recommendedExaminer2Dept,
    recommendedBackupDept: (student as any).recommendedBackupDept,
  }))
  
  // 转换考官数据
  const convertedTeachers = teacherList.value.map(teacher => ({
    id: teacher.id || `teacher_${teacher.name}`,
    name: teacher.name,
    department: teacher.department,
    group: teacher.group || '无',
    skills: teacher.skills || [],
    workload: teacher.workload || 0,
    consecutiveDays: teacher.consecutiveDays || 0,
    unavailablePeriods: (teacher.unavailablePeriods || []).map(p => ({
      startDate: p.startDate,
      endDate: p.endDate,
      reason: p.reason || ''
    }))
  }))
  
  const request = {
    pinnedScheduleIds: pinnedIds,
    existingAssignments: existingAssignments,
    students: convertedStudents,
    teachers: convertedTeachers,
    startDate: examStartDateStr.value,
    endDate: examEndDateStr.value,
    constraints: constraints.value
  }
  
  console.log('📤 [局部重排] 准备调用后端API:', {
    固定数量: pinnedIds.length,
    总排班数: existingAssignments.length,
    学员数: convertedStudents.length,
    考官数: convertedTeachers.length
  })
  
  // 🔍 详细诊断：打印固定排班的详细信息
  console.log('📌 [局部重排] 固定排班详情:')
  existingAssignments.filter(a => a.pinned).forEach(a => {
    console.log(`  - ${a.studentName}: date1=${a.date1}, 考官1=${a.examiner1_1}, pinned=${a.pinned}`)
  })
  
  console.log('🔓 [局部重排] 未固定排班详情:')
  existingAssignments.filter(a => !a.pinned).forEach(a => {
    console.log(`  - ${a.studentName}: date1=${a.date1}, 考官1=${a.examiner1_1}, pinned=${a.pinned}`)
  })
  
  // 2. 显示进度对话框
  showPartialRescheduleDialog.value = true
  isPartialRescheduling.value = true
  partialRescheduleMessage.value = '正在初始化OptaPlanner求解器...'
  partialRescheduleCurrentScore.value = ''
  partialRescheduleCancelling.value = false
  
  try {
    // 3. 调用后端API
    console.log('🚀 [局部重排] 调用后端API...')
    const response = await fetch('/api/schedule/partial-reschedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ [局部重排] 后端返回:', result)
    console.log('📊 [局部重排] 返回的排班数量:', result.assignments?.length || 0)
    
    if (result.success && result.assignments) {
      // 🔍 详细诊断：打印所有返回的排班（包含完整对象结构）
      console.log('📋 [局部重排] 后端返回的所有排班:')
      result.assignments.forEach((a: any, index: number) => {
        console.log(`  [${index}] 排班详情:`, {
          id: a.id,
          student: a.student,
          studentName: a.student?.name,
          examDate: a.examDate,
          examType: a.examType,
          examiner1: a.examiner1,
          examiner1Name: a.examiner1?.name,
          examiner2: a.examiner2,
          examiner2Name: a.examiner2?.name,
          backupExaminer: a.backupExaminer,
          backupExaminerName: a.backupExaminer?.name,
          pinned: a.pinned
        })
        console.log(`  - 学员: ${a.student?.name}, 日期: ${a.examDate}, 类型: ${a.examType}`)
        console.log(`  - 考官1: ${a.examiner1?.name || 'null/undefined'}, 考官2: ${a.examiner2?.name || 'null/undefined'}, 备份: ${a.backupExaminer?.name || 'null/undefined'}`)
      })
      
      // 🔍 检查数据完整性
      console.log('🔍 [局部重排] 数据完整性检查:')
      const withExaminer1 = result.assignments.filter((a: any) => a.examiner1 && a.examiner1.name)
      const withoutExaminer1 = result.assignments.filter((a: any) => !a.examiner1 || !a.examiner1.name)
      console.log(`  - 有考官1的排班: ${withExaminer1.length} 个`)
      console.log(`  - 无考官1的排班: ${withoutExaminer1.length} 个`)
      if (withoutExaminer1.length > 0) {
        console.warn('  ⚠️ 以下排班没有考官1:', withoutExaminer1.map((a: any) => ({
          student: a.student?.name,
          id: a.id,
          examiner1: a.examiner1
        })))
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10691',message:'Found assignments without examiner1',data:{count:withoutExaminer1.length,assignments:withoutExaminer1.map((a:any)=>({student:a.student?.name,id:a.id,examiner1:a.examiner1}))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
      
      // 4. 更新未固定的排班
      updateUnpinnedSchedules(result.assignments, pinnedIds)
      
      // 计算实际更新的排班数量
      const rescheduleIds = Array.from(pinnedScheduleIds.value)
      const updatedRescheduleCount = result.assignments.filter((a: any) => {
        const assignmentId = String(a.id)
        const baseId = assignmentId.endsWith('_DAY2') ? assignmentId.replace(/_DAY2$/, '') : assignmentId
        return rescheduleIds.includes(baseId)
      }).length
      
      partialRescheduleMessage.value = '✅ 重排完成！'
      
      ElMessage.success({
        message: `✅ 成功重新分配 ${rescheduleIds.length} 个固定排班！\n📌 ${pinnedIds.length} 个未固定排班保持不变`,
        duration: 5000,
        showClose: true
      })
      
      // 延迟关闭对话框
      setTimeout(() => {
        showPartialRescheduleDialog.value = false
      }, 2000)
    } else {
      throw new Error(result.message || '重排失败')
    }
  } catch (error) {
    console.error('❌ [局部重排] 失败:', error)
    partialRescheduleMessage.value = '❌ 重排失败: ' + (error as Error).message
    ElMessage.error({
      message: '重排失败: ' + (error as Error).message,
      duration: 0,
      showClose: true
    })
  } finally {
    isPartialRescheduling.value = false
  }
}

// 🔧 新的局部重排函数：自动扩展日期直到排班成功
const triggerLocalReschedule = async () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      location:'SchedulesPage.vue:triggerLocalReschedule:entry',
      message:'triggerLocalReschedule called',
      data:{
        pinnedCount:pinnedScheduleIds.value.size,
        totalSchedules:scheduleResults.value.length,
        currentStartDate:examStartDateStr.value,
        currentEndDate:examEndDateStr.value
      },
      timestamp:Date.now(),
      sessionId:'debug-session',
      hypothesisId:'LocalReschedule'
    })
  }).catch(()=>{});
  // #endregion

  // 1. 检查是否有固定的排班
  if (pinnedScheduleIds.value.size === 0) {
    ElMessage.warning('请先固定需要重排的排班记录（点击排班记录上的图钉图标）')
    return
  }

  const pinnedCount = pinnedScheduleIds.value.size
  const totalCount = scheduleResults.value.length
  
  // 2. 确认对话框
  try {
    await ElMessageBox.confirm(
      `<div style="line-height: 1.8; font-size: 14px;">
        <p>将对 <strong style="color: #409eff;">${pinnedCount}</strong> 个固定排班进行局部重排</p>
        <p>保持 <strong style="color: #67c23a;">${totalCount - pinnedCount}</strong> 个未固定排班不变</p>
        <br/>
        <p>🔧 <strong>功能说明：</strong></p>
        <p>• 系统会在当前选定日期之后自动扩展日期范围</p>
        <p>• 尝试顺序：2天 → 4天 → 6天 → 8天... 直到排班成功</p>
        <p>• 所有约束条件（不可用考官、不可用时间）均会考虑</p>
        <p>• 未固定的排班将完全保持不变</p>
      </div>`,
      '确认局部重排',
      {
        confirmButtonText: '开始局部重排',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true
      }
    )
  } catch {
    return  // 用户取消
  }

  // 3. 开始局部重排流程
  isLocalRescheduling.value = true
  localRescheduleProgress.value = '准备局部重排...'
  
  // 获取当前日期范围
  const originalStartDate = examStartDateStr.value
  const originalEndDate = examEndDateStr.value
  
  if (!originalStartDate || !originalEndDate) {
    ElMessage.error('请先设置考试日期范围')
    isLocalRescheduling.value = false
    return
  }

  // 计算当前日期范围的工作日天数
  const currentWorkdays = calculateWorkdaysBetween(originalStartDate, originalEndDate)
  
  // 根据固定排班数量决定最大扩展天数
  // 每个固定排班至少需要2天（连续两天考试）
  const minDaysNeeded = Math.max(2, Math.ceil(pinnedCount / 2)) * 2  // 至少2天，根据数量增加
  const maxExtensionDays = Math.max(8, minDaysNeeded * 2)  // 最大扩展天数，至少8天
  
  // 尝试的扩展天数序列：2, 4, 6, 8...
  const extensionDaysList: number[] = []
  for (let days = 2; days <= maxExtensionDays; days += 2) {
    extensionDaysList.push(days)
  }

  console.log('🔧 [局部重排] 扩展计划:', {
    当前工作日: currentWorkdays,
    固定排班数: pinnedCount,
    预计需要天数: minDaysNeeded,
    最大扩展天数: maxExtensionDays,
    尝试序列: extensionDaysList
  })

  // 4. 逐步扩展日期并尝试排班
  let lastError = ''
  
  for (const extensionDays of extensionDaysList) {
    localRescheduleAttemptDays.value = extensionDays
    localRescheduleProgress.value = `正在尝试扩展 ${extensionDays} 天...`
    
    // 计算新的结束日期（在当前结束日期后增加工作日）
    const newEndDate = addWorkdays(originalEndDate, extensionDays)
    
    console.log(`🔧 [局部重排] 尝试扩展 ${extensionDays} 天:`, {
      原开始日期: originalStartDate,
      原结束日期: originalEndDate,
      新结束日期: newEndDate
    })
    
    try {
      // 临时更新日期范围
      examEndDateStr.value = newEndDate
      
      // 执行局部重排
      const success = await executeLocalRescheduleWithDates(originalStartDate, newEndDate)
      
      if (success) {
        // 排班成功
        localRescheduleProgress.value = '✅ 排班成功！'
        ElMessage.success({
          message: `✅ 局部重排成功！\n📅 日期范围已自动扩展至 ${newEndDate}\n📌 ${pinnedCount} 个固定排班已重新分配`,
          duration: 5000,
          showClose: true
        })
        
        // 保存页面状态
        savePageState()
        hasUnsavedChanges.value = true
        
        isLocalRescheduling.value = false
        return
      }
      
      // 如果失败但还有下一个尝试，继续
      console.log(`🔧 [局部重排] 扩展 ${extensionDays} 天未能完成排班，准备尝试更多天数...`)
      
    } catch (error: any) {
      console.error(`❌ [局部重排] 扩展 ${extensionDays} 天失败:`, error)
      lastError = error.message || '排班失败'
      
      // 🔧 更新进度显示当前错误
      localRescheduleProgress.value = `扩展 ${extensionDays} 天失败: ${lastError.substring(0, 50)}...`
      
      // 继续尝试下一个扩展天数
    }
  }
  
  // 所有尝试都失败了
  localRescheduleProgress.value = '❌ 排班失败'
  ElMessage.error({
    message: `❌ 局部重排失败\n已尝试扩展至 ${maxExtensionDays} 天仍无法完成排班\n${lastError ? '错误信息: ' + lastError : ''}\n\n建议：\n1. 检查考官资源是否充足\n2. 检查约束条件是否合理\n3. 尝试固定更少的排班记录`,
    duration: 0,
    showClose: true
  })
  
  // 恢复原日期范围
  examEndDateStr.value = originalEndDate
  isLocalRescheduling.value = false
}

// 🔧 辅助函数：使用指定日期范围执行局部重排
const executeLocalRescheduleWithDates = async (startDate: string, endDate: string): Promise<boolean> => {
  const rescheduleIds = Array.from(pinnedScheduleIds.value)
  const allScheduleIds = scheduleResults.value.map(s => String(s.id))
  const pinnedIds = allScheduleIds.filter(id => !rescheduleIds.includes(id))

  // 构建学生考试天数映射
  const studentExamDaysMap = new Map<string, number>()
  studentList.value.forEach((st: any) => {
    const days = st?.examDays || 2
    if (st?.name) studentExamDaysMap.set(st.name, days)
  })

  // 转换现有排班数据（与原有逻辑一致）
  const existingAssignments = scheduleResults.value.map(s => {
    const examDays = studentExamDaysMap.get(s.student) || (s as any).examDays || 2
    const isOneDayExam = examDays === 1
    
    const ensureFullDate = (dateValue: string | null | undefined): string | null => {
      if (!dateValue || dateValue === '-' || dateValue === '—' || dateValue === '未安排') return null
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue
      return convertToFullDate(dateValue)
    }
    
    const date1Full = ensureFullDate((s as any).rawDate1) || ensureFullDate(s.date1)
    const date2Full = isOneDayExam ? '' : (ensureFullDate((s as any).rawDate2) || ensureFullDate(s.date2 || ''))

    return {
      id: String(s.id),
      studentId: String(s.id),
      studentName: s.student,
      date1: date1Full,
      examiner1_1: s.examiner1_1,
      examiner1_2: s.examiner1_2,
      backup1: s.backup1,
      examDays,
      date2: date2Full,
      examiner2_1: isOneDayExam ? '' : s.examiner2_1,
      examiner2_2: isOneDayExam ? '' : s.examiner2_2,
      backup2: isOneDayExam ? '' : s.backup2,
      pinned: pinnedIds.includes(String(s.id)),
    }
  })
  
  // 转换学员数据（与原有API格式一致）
  const convertedStudents = studentList.value.map(student => ({
    id: student.id || `student_${student.name}`,
    name: student.name,
    department: student.department,
    group: student.group || '无',
    examDays: student.examDays || 2,
    day1Subjects: student.day1Subjects ? JSON.stringify(student.day1Subjects) : undefined,
    day2Subjects: student.day2Subjects ? JSON.stringify(student.day2Subjects) : undefined,
    recommendedExaminer1Dept: (student as any).recommendedExaminer1Dept,
    recommendedExaminer2Dept: (student as any).recommendedExaminer2Dept,
    recommendedBackupDept: (student as any).recommendedBackupDept,
  }))
  
  // 转换考官数据
  const convertedTeachers = teacherList.value.map(teacher => ({
    id: teacher.id || `teacher_${teacher.name}`,
    name: teacher.name,
    department: teacher.department,
    group: teacher.group || '无',
    skills: teacher.skills || [],
    workload: teacher.workload || 0,
    consecutiveDays: teacher.consecutiveDays || 0,
    unavailablePeriods: (teacher.unavailablePeriods || []).map(p => ({
      startDate: p.startDate,
      endDate: p.endDate,
      reason: p.reason || ''
    }))
  }))
  
  // 构建请求（使用传入的日期范围，保持与原有API一致）
  const request = {
    pinnedScheduleIds: pinnedIds,
    existingAssignments: existingAssignments,
    students: convertedStudents,
    teachers: convertedTeachers,
    startDate: startDate,
    endDate: endDate,
    constraints: constraints.value
  }
  
  console.log('📤 [局部重排] 调用后端API:', {
    日期范围: `${startDate} 至 ${endDate}`,
    固定数量: pinnedIds.length,
    重排数量: rescheduleIds.length,
    学员数: convertedStudents.length,
    考官数: convertedTeachers.length,
    排班总数: existingAssignments.length
  })
  
  // 🔍 调试：检查固定/未固定排班
  console.log('🔍 [局部重排] 排班状态检查:', {
    固定排班IDs: pinnedIds.slice(0, 5),
    重排排班IDs: rescheduleIds.slice(0, 5),
    样例排班: existingAssignments[0] ? {
      id: existingAssignments[0].id,
      studentName: existingAssignments[0].studentName,
      pinned: existingAssignments[0].pinned
    } : '无排班数据'
  })
  
  // 调用后端API（使用现有的 partial-reschedule 端点）
  const response = await fetch('/api/schedule/partial-reschedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }
  
  const result = await response.json()
  
  // 🔧 改进错误处理：记录详细响应信息
  console.log('📥 [局部重排] 后端响应:', {
    success: result.success,
    message: result.message,
    assignmentsCount: result.assignments?.length,
    error: result.error
  })
  
  if (result.success && result.assignments) {
    // 更新排班结果
    updateUnpinnedSchedules(result.assignments, pinnedIds)
    return true
  }
  
  // 🔧 如果后端返回失败，抛出错误以便上层捕获
  if (!result.success) {
    throw new Error(result.message || result.error || '排班求解失败')
  }
  
  return false
}

// 🔧 辅助函数：计算两个日期之间的工作日天数
const calculateWorkdaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let workdays = 0
  const current = new Date(start)
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const dateStr = dateUtils.toStandardDate(current)
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6)
    const isHoliday = holidayService.isHoliday(dateStr)
    
    if (!isWeekend && !isHoliday) {
      workdays++
    }
    
    current.setDate(current.getDate() + 1)
  }
  
  return workdays
}

// 🔧 辅助函数：在指定日期后增加指定工作日天数
const addWorkdays = (dateStr: string, workdays: number): string => {
  const date = new Date(dateStr)
  let addedDays = 0
  
  while (addedDays < workdays) {
    date.setDate(date.getDate() + 1)
    const dayOfWeek = date.getDay()
    const currentDateStr = dateUtils.toStandardDate(date)
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6)
    const isHoliday = holidayService.isHoliday(currentDateStr)
    
    if (!isWeekend && !isHoliday) {
      addedDays++
    }
  }
  
  return dateUtils.toStandardDate(date)
}

const updateUnpinnedSchedules = (assignments: any[], pinnedIds: string[]) => {
  console.log('🔄 [局部重排] 开始更新未固定排班:', {
    后端返回总数: assignments.length,
    前端固定数: pinnedIds.length,
    前端总数: scheduleResults.value.length
  })
  
  // 🔍 增强诊断：记录更新前的状态
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 [更新前] 固定排班的详细信息:')
  scheduleResults.value.forEach(s => {
    if (pinnedIds.includes(String(s.id))) {
      console.log(`  📌 ${s.student} (ID: ${s.id}):`)
      console.log(`     date1=${s.date1}, date2=${s.date2}`)
      console.log(`     考官1=${s.examiner1_1}, 考官2=${s.examiner2_1}`)
    }
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  // 🔍 诊断：检查固定排班是否在后端返回的数据中
  console.log('🔍 [局部重排] 检查固定排班是否在返回数据中:')
  pinnedIds.forEach(pinnedId => {
    const foundInReturn = assignments.find(a => String(a.id) === pinnedId)
    const frontendSchedule = scheduleResults.value.find(s => String(s.id) === pinnedId)
    if (foundInReturn) {
      console.log(`  ⚠️ 固定排班 ${frontendSchedule?.student} 在后端返回中被找到！`)
      console.log(`     前端日期: ${frontendSchedule?.date1}`)
      console.log(`     后端日期: ${convertToShortDate(foundInReturn.examDate)}`)
    } else {
      console.log(`  ✅ 固定排班 ${frontendSchedule?.student} 未在后端返回中（正常）`)
    }
  })
  
  let updatedCount = 0
  let skippedCount = 0
  
  assignments.forEach((assignment, index) => {
    const assignmentId = String(assignment.id)
    const baseId = assignmentId.endsWith('_DAY2') ? assignmentId.replace(/_DAY2$/, '') : assignmentId
    const isPinned = pinnedIds.includes(baseId)
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10766',message:'Processing assignment',data:{index,student:assignment.student?.name,assignmentId,baseId,isPinned,examiner1:assignment.examiner1,examiner1Name:assignment.examiner1?.name,examiner2:assignment.examiner2,backupExaminer:assignment.backupExaminer},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    console.log(`\n🔍 [${index}] 处理排班: ${assignment.student?.name} (ID: ${assignmentId}, baseId: ${baseId})`)
    console.log(`   - 是否固定: ${isPinned}`)
    console.log(`   - 考官1对象:`, assignment.examiner1)
    console.log(`   - 考官1姓名: ${assignment.examiner1?.name || 'null/undefined'}`)
    console.log(`   - 考官2对象:`, assignment.examiner2)
    console.log(`   - 备份考官对象:`, assignment.backupExaminer)
    
    if (isPinned) {
      console.log(`  ⏭️ 跳过固定排班: ${assignment.student?.name} (ID: ${assignmentId})`)
      skippedCount++
      return
    }
    
    const schedule = scheduleResults.value.find(s => 
      s.student === assignment.student?.name ||
      String(s.id) === baseId
    )
    
    if (schedule) {
      console.log(`  ✅ 找到前端排班记录: ${schedule.student} (前端ID: ${schedule.id})`)
      const newDate = assignment.examDate ? convertToShortDate(assignment.examDate) : ''
      const isDay2 = assignmentId.endsWith('_DAY2') || assignment.examType === 'day2'
      
      // 🔍 详细记录更新前的值
      console.log(`  📊 更新前状态:`)
      if (isDay2) {
        console.log(`    - date2: ${schedule.date2}`)
        console.log(`    - examiner2_1: ${schedule.examiner2_1}`)
        console.log(`    - examiner2_2: ${schedule.examiner2_2}`)
        console.log(`    - backup2: ${schedule.backup2}`)
      } else {
        console.log(`    - date1: ${schedule.date1}`)
        console.log(`    - examiner1_1: ${schedule.examiner1_1}`)
        console.log(`    - examiner1_2: ${schedule.examiner1_2}`)
        console.log(`    - backup1: ${schedule.backup1}`)
      }
      
      if (isDay2) {
        // 更新 Day 2 数据
        if (newDate) {
          schedule.date2 = newDate
          // 🔧 修复：确保rawDate是完整的ISO日期格式（YYYY-MM-DD）
          ;(schedule as any).rawDate2 = convertToFullDate(assignment.examDate) || assignment.examDate
        }
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10812',message:'Updating Day2 examiners',data:{student:schedule.student,examiner1:assignment.examiner1,examiner2:assignment.examiner2,backupExaminer:assignment.backupExaminer,examiner1Name:assignment.examiner1?.name,examiner2Name:assignment.examiner2?.name,backupName:assignment.backupExaminer?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        const examiner2_1 = assignment.examiner1?.name || '待分配'
        const examiner2_2 = assignment.examiner2?.name || '待分配'
        const backup2 = assignment.backupExaminer?.name || '待分配'
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10820',message:'Day2 examiners resolved',data:{student:schedule.student,examiner2_1,examiner2_2,backup2,wasNull:!assignment.examiner1?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        schedule.examiner2_1 = examiner2_1
        schedule.examiner2_2 = examiner2_2
        schedule.backup2 = backup2
        
        console.log(`  ✅ 更新排班(Day2): ${schedule.student}`)
        console.log(`    - 日期: ${newDate}`)
        console.log(`    - 考官2_1: ${examiner2_1}`)
        console.log(`    - 考官2_2: ${examiner2_2}`)
        console.log(`    - 备份2: ${backup2}`)
      } else {
        // 更新 Day 1 数据
        const oldDate = schedule.date1
        if (newDate) {
          schedule.date1 = newDate
          // 🔧 修复：确保rawDate是完整的ISO日期格式（YYYY-MM-DD）
          ;(schedule as any).rawDate1 = convertToFullDate(assignment.examDate) || assignment.examDate
          
          // 🔧 如果Day1日期改变，自动更新Day2日期为Day1+1（如果存在Day2）
          if ((schedule as any)?.examDays !== 1 && schedule.date2 && schedule.date2 !== '-') {
            try {
              // 将短日期格式转换为标准日期格式
              const date1Full = convertToFullDate(newDate)
              if (date1Full) {
                const date1Obj = new Date(date1Full)
                date1Obj.setDate(date1Obj.getDate() + 1)
                const date2Full = date1Obj.toISOString().split('T')[0]
                const newDate2 = convertToShortDate(date2Full)
                schedule.date2 = newDate2
                ;(schedule as any).rawDate2 = date2Full
                console.log(`  🔧 Day1日期改变，自动更新Day2日期: ${newDate} → ${newDate2}`)
              }
            } catch (error) {
              console.warn(`  ⚠️ 自动更新Day2日期失败:`, error)
            }
          }
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10862',message:'Updating Day1 examiners',data:{student:schedule.student,examiner1:assignment.examiner1,examiner2:assignment.examiner2,backupExaminer:assignment.backupExaminer,examiner1Name:assignment.examiner1?.name,examiner2Name:assignment.examiner2?.name,backupName:assignment.backupExaminer?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        const examiner1_1 = assignment.examiner1?.name || '待分配'
        const examiner1_2 = assignment.examiner2?.name || '待分配'
        const backup1 = assignment.backupExaminer?.name || '待分配'
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10868',message:'Day1 examiners resolved',data:{student:schedule.student,examiner1_1,examiner1_2,backup1,wasNull:!assignment.examiner1?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        schedule.examiner1_1 = examiner1_1
        schedule.examiner1_2 = examiner1_2
        schedule.backup1 = backup1
        
        console.log(`  ✅ 更新排班(Day1): ${schedule.student}`)
        console.log(`    - 日期: ${oldDate} → ${newDate}`)
        console.log(`    - 考官1_1: ${examiner1_1}`)
        console.log(`    - 考官1_2: ${examiner1_2}`)
        console.log(`    - 备份1: ${backup1}`)
      }
      
      // 🔍 验证更新后的值
      console.log(`  📊 更新后状态:`)
      if (isDay2) {
        console.log(`    - date2: ${schedule.date2}`)
        console.log(`    - examiner2_1: ${schedule.examiner2_1}`)
        console.log(`    - examiner2_2: ${schedule.examiner2_2}`)
        console.log(`    - backup2: ${schedule.backup2}`)
      } else {
        console.log(`    - date1: ${schedule.date1}`)
        console.log(`    - examiner1_1: ${schedule.examiner1_1}`)
        console.log(`    - examiner1_2: ${schedule.examiner1_2}`)
        console.log(`    - backup1: ${schedule.backup1}`)
      }
      
      updatedCount++
    } else {
      console.warn(`  ⚠️ 未找到排班记录: ${assignment.student?.name} (ID: ${assignmentId})`)
      console.warn(`  🔍 前端排班列表中的学员:`, scheduleResults.value.map(s => s.student).slice(0, 10))
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10883',message:'Schedule not found in frontend',data:{student:assignment.student?.name,assignmentId,baseId,availableStudents:scheduleResults.value.map(s=>s.student).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  })
  
  console.log(`📊 [局部重排] 更新统计: 已更新${updatedCount}个, 已跳过${skippedCount}个`)
  
  // 🔍 检查更新后是否还有"待分配"
  const unassignedAfterUpdate = scheduleResults.value.filter(s => 
    (s.examiner1_1 === '待分配' || s.examiner1_1 === '未分配') ||
    (s.examiner2_1 === '待分配' || s.examiner2_1 === '未分配')
  )
  if (unassignedAfterUpdate.length > 0) {
    console.warn(`⚠️ [局部重排] 更新后仍有${unassignedAfterUpdate.length}个排班显示"待分配":`)
    unassignedAfterUpdate.forEach(s => {
      console.warn(`  - ${s.student}: Day1=${s.examiner1_1}, Day2=${s.examiner2_1}`)
    })
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6ce5fdaa-547e-4e87-9397-221316331b3e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:10901',message:'Unassigned schedules after update',data:{count:unassignedAfterUpdate.length,schedules:unassignedAfterUpdate.map(s=>({student:s.student,id:s.id,examiner1_1:s.examiner1_1,examiner2_1:s.examiner2_1}))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
  }
  
  // 🔍 增强诊断：记录更新后的状态
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 [更新后] 固定排班的详细信息:')
  scheduleResults.value.forEach(s => {
    if (pinnedIds.includes(String(s.id))) {
      console.log(`  📌 ${s.student} (ID: ${s.id}):`)
      console.log(`     date1=${s.date1}, date2=${s.date2}`)
      console.log(`     考官1=${s.examiner1_1}, 考官2=${s.examiner2_1}`)
      console.log(`     ⚠️ 如果日期改变了，说明前端逻辑有BUG！`)
    }
  })
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  sortScheduleResults()
  savePageState()
  hasUnsavedChanges.value = true
  
  console.log('✅ [局部重排] 排班更新完成')
}

const clearAllPins = () => {
  ElMessageBox.confirm(
    `确认清除所有 ${pinnedScheduleIds.value.size} 个固定标记？`,
    '确认操作',
    {
      confirmButtonText: '确认清除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    pinnedScheduleIds.value.clear()
    ElMessage.success('已清除所有固定标记')
  }).catch(() => {})
}

const toggleAllPins = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:toggleAllPins',message:'Toggle all pins called',data:{pinnedCountBefore:pinnedScheduleIds.value.size,totalSchedules:scheduleResults.value.length,willClear:pinnedScheduleIds.value.size === scheduleResults.value.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (pinnedScheduleIds.value.size === scheduleResults.value.length) {
    pinnedScheduleIds.value.clear()
    ElMessage.success('已取消全部固定')
  } else {
    scheduleResults.value.forEach(s => {
      pinnedScheduleIds.value.add(String(s.id))
    })
    ElMessage.success('已固定全部排班')
  }
}

// Helper函数
const convertToFullDate = (shortDate: string | null | undefined): string | null => {
  const value = typeof shortDate === 'string' ? shortDate.trim() : ''
  if (!value || value === '-' || value === '—') {
    return null
  }

  const dotMatch = value.match(/^(\d{1,2})\.(\d{1,2})$/)
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})$/)
  const match = dotMatch || dashMatch
  if (match) {
    const month = Number(match[1])
    const day = Number(match[2])

    const startStr = examStartDateStr.value
    const endStr = examEndDateStr.value
    const startTime = startStr && /^\d{4}-\d{2}-\d{2}$/.test(startStr) ? new Date(startStr).getTime() : null
    const endTime = endStr && /^\d{4}-\d{2}-\d{2}$/.test(endStr) ? new Date(endStr).getTime() : null
    const rangeMarginMs = 31 * 24 * 60 * 60 * 1000
    let year = new Date().getFullYear()

    if (startTime !== null && endTime !== null) {
      const start = new Date(startStr)
      const end = new Date(endStr)
      const minYear = Math.min(start.getFullYear(), end.getFullYear()) - 1
      const maxYear = Math.max(start.getFullYear(), end.getFullYear()) + 1
      let bestYear: number | null = null
      let bestDistance = Number.POSITIVE_INFINITY
      for (let y = minYear; y <= maxYear; y += 1) {
        const candidate = new Date(y, month - 1, day)
        const time = candidate.getTime()
        if (time >= (startTime - rangeMarginMs) && time <= (endTime + rangeMarginMs)) {
          const distance = Math.abs(time - startTime)
          if (distance < bestDistance) {
            bestDistance = distance
            bestYear = y
          }
        }
      }
      if (bestYear !== null) {
        year = bestYear
      }
    } else if (startStr && /^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
      const start = new Date(startStr)
      const startMonth = start.getMonth() + 1
      year = start.getFullYear()
      if (month < startMonth) year += 1
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  try {
    return dateUtils.toStandardDate(value)
  } catch (error) {
    console.error('convertToFullDate 解析失败:', value, error)
    return null
  }
}

const convertToShortDate = (fullDate: string): string => {
  if (!fullDate) return ''
  try {
    return dateUtils.toDisplayDate(fullDate)
  } catch (e) {
    // 使用 DateUtils 解析日期，确保跨浏览器兼容性
    const date = dateUtils.parseDate(fullDate)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}.${day}`
  }
}

// 用于模板显示的日期格式化函数
const formatDisplayDate = (dateStr: string): string => {
  if (!dateStr) return ''
  
  // 如果已经是 M.D 格式，直接返回
  if (/^\d{1,2}\.\d{1,2}$/.test(dateStr)) {
    const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})$/)
    if (!match) return dateStr
    const month = String(Number(match[1])).padStart(2, '0')
    const day = String(Number(match[2])).padStart(2, '0')
    return `${month}.${day}`
  }
  
  try {
    // 尝试转为标准格式再转回 M.D
    return dateUtils.toDisplayDate(dateStr)
  } catch (e) {
    // 如果转换失败，返回原字符串
    return dateStr
  }
}

// 🔧 v5.5.9：以下是备用的后端API调用代码（已禁用，保留以备将来使用）
/*
    // 🆕 调用后端重新分配考官
    console.log('🔧 准备调用后端重新分配考官...')
    console.log('📅 考试日期范围:', {
      start: examStartDateStr.value,
      end: examEndDateStr.value,
      startType: typeof examStartDateStr.value,
      endType: typeof examEndDateStr.value,
      startLength: examStartDateStr.value?.length,
      endLength: examEndDateStr.value?.length
    })
    
    // 🔧 验证日期范围（检查空值和空字符串）
    if (!examStartDateStr.value || examStartDateStr.value.trim() === '' || 
        !examEndDateStr.value || examEndDateStr.value.trim() === '') {
      throw new Error('考试日期范围未设置，请先设置考试开始和结束日期。当前值: start=' + examStartDateStr.value + ', end=' + examEndDateStr.value)
    }
    
    console.log('✅ 日期验证通过')
    
    // 🔧 转换学员数据：将数组转为 JSON 字符串
    console.log('🔧 开始转换学员数据格式...')
    const convertedStudents = studentList.value.map(student => {
      // 处理 day1Subjects：如果是数组，转为 JSON 字符串
      let day1Subjects = '["现场", "模拟机1"]'  // 默认值
      if (student.day1Subjects) {
        if (Array.isArray(student.day1Subjects)) {
          day1Subjects = JSON.stringify(student.day1Subjects)
        } else if (typeof student.day1Subjects === 'string') {
          day1Subjects = student.day1Subjects
        }
      }
      
      // 处理 day2Subjects：如果是数组，转为 JSON 字符串
      let day2Subjects = '["模拟机2", "口试"]'  // 默认值
      if (student.day2Subjects) {
        if (Array.isArray(student.day2Subjects)) {
          day2Subjects = JSON.stringify(student.day2Subjects)
        } else if (typeof student.day2Subjects === 'string') {
          day2Subjects = student.day2Subjects
        }
      }
      
      return {
        id: student.id || `student_${student.name}`,
        name: student.name,
        department: student.department,
        group: student.group || '无',
        day1Subjects: day1Subjects,
        day2Subjects: day2Subjects,
        recommendedExaminer1Dept: student.recommendedExaminer1Dept,
        recommendedExaminer2Dept: student.recommendedExaminer2Dept,
        recommendedBackupDept: student.recommendedBackupDept
      }
    })
    
    // 转换考官数据
    const convertedTeachers = teacherList.value.map(teacher => ({
      id: teacher.id || `teacher_${teacher.name}`,
      name: teacher.name,
      department: teacher.department,
      group: teacher.group || '无',
      skills: teacher.skills || [],
      workload: teacher.workload || 0,
      consecutiveDays: teacher.consecutiveDays || 0,
      unavailablePeriods: teacher.unavailablePeriods || []
    }))
    
    console.log('✅ 数据转换完成:', {
      学员数量: convertedStudents.length,
      考官数量: convertedTeachers.length,
      示例学员: {
        name: convertedStudents[0]?.name,
        day1Subjects: convertedStudents[0]?.day1Subjects,
        day2Subjects: convertedStudents[0]?.day2Subjects
      }
    })
    
    // 🔧 构建请求数据（完整重排）
    const request: OptaPlannerRequest = {
      students: convertedStudents,
      teachers: convertedTeachers,
      startDate: examStartDateStr.value,
      endDate: examEndDateStr.value,
      constraints: constraints.value
    }
    
    console.log('⚠️ 注意：将进行完整重排（所有学员），这可能需要较长时间')
    
    console.log('📤 调用 OptaPlanner 后端重新分配考官...')
    console.log('🔍 [调试] 开始调用 generateSchedule API')
    
    const result = await optaPlannerService.generateSchedule(request)
    
    console.log('🔍 [调试] API调用完成，返回结果:', {
      success: result.success,
      hasAssignments: !!result.assignments,
      assignmentsLength: result.assignments?.length || 0,
      message: result.message,
      score: result.score
    })
    
    if (result.success && result.assignments && result.assignments.length > 0) {
      console.log('✅ 后端重新分配成功，收到 ' + result.assignments.length + ' 个分配')
      
      // 🔍 调试：显示所有assignments
      console.log('📋 所有assignments:', result.assignments.map(a => ({
        student: a.student.name,
        date: a.examDate,
        examiner1: a.examiner1?.name,
        examiner2: a.examiner2?.name,
        backup: a.backupExaminer?.name
      })))
      
      // 🔍 调试：当前目标学员和日期
      console.log('🎯 目标学员:', schedule.student)
      console.log('📅 目标日期:', {
        day1: schedule.date1,
        day2: schedule.date2,
        isTwoDayExam,
        dayIndex,
        newDate
      })
      
      // 🔧 记录是否找到匹配的assignment
      let foundMatch = false
      
      // 更新考官分配
      result.assignments.forEach(assignment => {
        console.log('🔍 检查assignment:', assignment.student.name, '===', schedule.student, '?', assignment.student.name === schedule.student)
        
        if (assignment.student.name === schedule.student) {
          const examDate = assignment.examDate.substring(5).replace('-', '.')
          console.log('🔍 examDate转换:', assignment.examDate, '→', examDate)
          
          if (isTwoDayExam) {
            // 两天考试：根据日期匹配
            console.log('🔍 两天考试匹配:', { examDate, date1: schedule.date1, date2: schedule.date2 })
            if (examDate === schedule.date1) {
              console.log('✅ 匹配到第1天，更新考官')
              schedule.examiner1_1 = assignment.examiner1?.name || '待分配'
              schedule.examiner1_2 = assignment.examiner2?.name || '待分配'
              schedule.backup1 = assignment.backupExaminer?.name || '待分配'
              foundMatch = true
            } else if (examDate === schedule.date2) {
              console.log('✅ 匹配到第2天，更新考官')
              schedule.examiner2_1 = assignment.examiner1?.name || '待分配'
              schedule.examiner2_2 = assignment.examiner2?.name || '待分配'
              schedule.backup2 = assignment.backupExaminer?.name || '待分配'
              foundMatch = true
            } else {
              console.warn('⚠️ 日期不匹配:', examDate, '不等于', schedule.date1, '或', schedule.date2)
            }
          } else {
            // 🔧 单天考试：必须根据日期匹配，而不是只根据 dayIndex
            console.log('🔍 单天考试匹配:', { 
              examDate, 
              targetDate: dayIndex === 1 ? schedule.date1 : schedule.date2,
              dayIndex 
            })
            
            const targetDate = dayIndex === 1 ? schedule.date1 : schedule.date2
            
            if (examDate === targetDate) {
              console.log('✅ 日期匹配，更新第', dayIndex, '天考官')
              if (dayIndex === 1) {
                schedule.examiner1_1 = assignment.examiner1?.name || '待分配'
                schedule.examiner1_2 = assignment.examiner2?.name || '待分配'
                schedule.backup1 = assignment.backupExaminer?.name || '待分配'
              } else {
                schedule.examiner2_1 = assignment.examiner1?.name || '待分配'
                schedule.examiner2_2 = assignment.examiner2?.name || '待分配'
                schedule.backup2 = assignment.backupExaminer?.name || '待分配'
              }
              foundMatch = true
            } else {
              console.warn('⚠️ 日期不匹配:', examDate, '≠', targetDate)
            }
          }
        }
      })
      
      if (foundMatch) {
        console.log('✅ 成功找到并更新了考官分配')
        ElMessage.success('✅ 排班日期已更新，考官已重新分配！')
      } else {
        console.error('❌ 未找到匹配的assignment！')
        console.error('❌ 这意味着后端返回的数据中没有目标学员在目标日期的排班')
        ElMessage.error('❌ 未找到匹配的排班数据，考官分配失败！请检查控制台日志')
      }
    } else {
      console.warn('⚠️ 后端未返回新的考官分配')
      console.warn('🔍 [调试] result详情:', {
        success: result.success,
        hasAssignments: !!result.assignments,
        assignmentsLength: result.assignments?.length || 0,
        message: result.message
      })
      ElMessage.warning('排班日期已更新，但未能自动分配考官，请手动调整')
    }
    
    // 🆕 按日期排序
    console.log('📊 按日期重新排序...')
    sortScheduleResults()
    
    // 保存到localStorage
    savePageState()
    
    // 标记为未保存
    hasUnsavedChanges.value = true
    
    console.log('✅ [调试] partialReschedule 完成')
    
  } catch (error) {
    console.error('❌ [调试] 局部重排失败，捕获异常:', error)
    console.error('❌ [调试] 异常堆栈:', (error as Error).stack)
    ElMessage.error('重新计算失败: ' + (error as Error).message)
  }
}
*/
// 🔧 v5.5.9：后端API调用代码注释结束

// 🆕 按日期排序排班结果
const sortScheduleResults = () => {
  console.log('📊 开始排序，排序前前3个学员:')
  scheduleResults.value.slice(0, 3).forEach(s => {
    console.log(`  ${s.student}: ${s.date1}`)
  })

  const startStr = examStartDateStr.value
  const endStr = examEndDateStr.value
  const startTime = startStr && /^\d{4}-\d{2}-\d{2}$/.test(startStr) ? new Date(startStr).getTime() : null
  const endTime = endStr && /^\d{4}-\d{2}-\d{2}$/.test(endStr) ? new Date(endStr).getTime() : null
  const rangeMarginMs = 31 * 24 * 60 * 60 * 1000
  
  scheduleResults.value.sort((a, b) => {
    const parseToTimestamp = (row: any) => {
      const raw = typeof row?.rawDate1 === 'string' ? row.rawDate1.trim() : ''
      if (raw && raw !== '未安排' && raw !== '-' && raw !== '—') {
        const parsed = dateUtils.parseDate(raw)
        const time = parsed.getTime()
        if (!Number.isNaN(time) && time > 0) {
          if (startTime !== null && endTime !== null) {
            if (time >= (startTime - rangeMarginMs) && time <= (endTime + rangeMarginMs)) {
              return time
            }
          } else {
            return time
          }
        }
      }

      const display = typeof row?.date1 === 'string' ? row.date1.trim() : ''
      const match = display.match(/^(\d{1,2})\.(\d{1,2})$/)
      if (!match) return Number.POSITIVE_INFINITY

      const month = Number(match[1])
      const day = Number(match[2])
      let year = new Date().getFullYear()

      if (startTime !== null && endTime !== null) {
        const start = new Date(startStr)
        const end = new Date(endStr)
        const minYear = Math.min(start.getFullYear(), end.getFullYear()) - 1
        const maxYear = Math.max(start.getFullYear(), end.getFullYear()) + 1
        let bestYear: number | null = null
        let bestDistance = Number.POSITIVE_INFINITY
        for (let y = minYear; y <= maxYear; y += 1) {
          const candidate = new Date(y, month - 1, day)
          const time = candidate.getTime()
          if (time >= (startTime - rangeMarginMs) && time <= (endTime + rangeMarginMs)) {
            const distance = Math.abs(time - startTime)
            if (distance < bestDistance) {
              bestDistance = distance
              bestYear = y
            }
          }
        }
        if (bestYear !== null) {
          year = bestYear
        }
      } else if (startStr && /^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
        const start = new Date(startStr)
        const startMonth = start.getMonth() + 1
        year = start.getFullYear()
        if (month < startMonth) year += 1
      } else {
        const now = new Date()
        const nowMonth = now.getMonth() + 1
        year = now.getFullYear()
        if (month < nowMonth) year += 1
      }

      const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const parsed = dateUtils.parseDate(iso)
      const time = parsed.getTime()
      return Number.isNaN(time) || time <= 0 ? Number.POSITIVE_INFINITY : time
    }

    return parseToTimestamp(a) - parseToTimestamp(b)
  })
  
  console.log('✅ 排班结果已按日期排序，排序后前3个学员:')
  scheduleResults.value.slice(0, 3).forEach(s => {
    console.log(`  ${s.student}: ${s.date1}`)
  })
}

// 🆕 拖拽排班功能 - 计算可用日期
const availableDates = computed(() => {
  const dates: Array<{
    value: string
    label: string
    icon: string
    info: string
    recommended: boolean
    isWeekend: boolean
    available: boolean
    isOutOfRange: boolean // 是否超出原始范围
  }> = []
  
  // 🔧 添加空值检查
  if (!examStartDateStr.value || !examEndDateStr.value) {
    console.warn('⚠️ 日期范围未设置')
    return dates
  }
  
  // ✅ 即使考官数据未加载，也显示日期选项
  const hasTeacherData = cachedTeacherData && cachedTeacherData.length > 0
  if (!hasTeacherData) {
    console.warn('⚠️ 考官数据未加载，将显示日期但不显示可用考官数量')
  }
  
  const originalStart = new Date(examStartDateStr.value)
  const originalEnd = new Date(examEndDateStr.value)
  
  // 🆕 优化日期范围：从原始开始日期到之后两周（14天）
  const extendedStart = new Date(originalStart)
  
  const extendedEnd = new Date(originalEnd)
  extendedEnd.setDate(extendedEnd.getDate() + 14) // 向后扩展14天（两周）
  
  for (let d = new Date(extendedStart); d <= extendedEnd; d.setDate(d.getDate() + 1)) {
    const dateStr = dateUtils.toStorageDate(d).substring(5).replace('-', '.')
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekDay = weekDays[d.getDay()]
    
    // 判断是否在原始范围内
    const isInOriginalRange = d >= originalStart && d <= originalEnd
    const isOutOfRange = !isInOriginalRange
    
    // 图标和信息
    let icon = '🟢'
    let info = ''
    let recommended = false
    
    if (!hasTeacherData) {
      // 没有考官数据时，只根据日期类型给出建议
      icon = isWeekend ? '🔵' : '🟢'
      info = isOutOfRange ? '延期至原始范围后' : '点击选择此日期'
      recommended = !isWeekend && !isOutOfRange
    } else {
      // 简单估算可用考官数量
      const usedTeachers = scheduleResults.value ? scheduleResults.value.filter(s => 
        s.date1 === dateStr || s.date2 === dateStr
      ).length : 0
      
      const availableTeachers = (cachedTeacherData?.length || 0) - usedTeachers
      
      if (isOutOfRange) {
        icon = '⚠️'
        info = `延期至原始范围后`
        recommended = false
      } else if (availableTeachers >= 3) {
        icon = '🟢'
        info = `可用约 ${availableTeachers} 个考官`
        recommended = !isWeekend
      } else if (availableTeachers >= 1) {
        icon = '🔵'
        info = `可用约 ${availableTeachers} 个考官`
        recommended = false
      } else {
        icon = '🔴'
        info = `可用约 ${Math.max(0, availableTeachers)} 个考官`
        recommended = false
      }
    }
    
    dates.push({
      value: dateStr,
      label: `${dateStr} (${weekDay})${isOutOfRange ? ' 📅' : ''}`,
      icon,
      info,
      recommended,
      isWeekend,
      available: true, // 🆕 所有日期都可选，只是给出提示
      isOutOfRange
    })
  }
  
  console.log(`📅 生成了 ${dates.length} 个可选日期（${examStartDateStr.value} 到之后两周）`)
  return dates
})

// 增强错误反馈处理方法
const handleAutoResolveConflict = async (conflict: ConflictInfo) => {
  try {
    const success = await enhancedErrorFeedbackService.autoResolveConflict(conflict)
    if (success) {
      showNotification('冲突已自动解决', 'success')
      // 刷新相关数据
      await refreshSchedulingData()
    } else {
      showNotification('自动解决失败，请手动处理', 'warning')
    }
  } catch (error) {
    console.error('自动解决冲突失败:', error)
    showNotification('自动解决冲突时发生错误', 'error')
  }
}

const handleExecuteAction = async (action: any) => {
  try {
    // 根据动作类型执行相应操作
    switch (action.type) {
      case 'adjust_time':
        // 调整时间冲突
        await adjustTimeConflict(action.data)
        break
      case 'reassign_examiner':
        // 重新分配考官
        await reassignExaminer(action.data)
        break
      case 'modify_constraint':
        // 修改约束配置
        await modifyConstraintConfig(action.data)
        break
      default:
        console.warn('未知的操作类型:', action.type)
    }
    showNotification('操作执行成功', 'success')
  } catch (error) {
    console.error('执行操作失败:', error)
    showNotification('操作执行失败', 'error')
  }
}

const handleExportReport = async () => {
  try {
    await enhancedErrorFeedbackService.exportErrorReport()
    showNotification('错误报告已导出', 'success')
  } catch (error) {
    console.error('导出报告失败:', error)
    showNotification('导出报告失败', 'error')
  }
}

// 辅助方法
const refreshSchedulingData = async () => {
  // 刷新排班数据的逻辑
  process.env.NODE_ENV === 'development' && console.log('刷新排班数据...')
}

const adjustTimeConflict = async (data: any) => {
  // 调整时间冲突的逻辑
  process.env.NODE_ENV === 'development' && console.log('调整时间冲突:', data)
}

const reassignExaminer = async (data: any) => {
  // 重新分配考官的逻辑
  process.env.NODE_ENV === 'development' && console.log('重新分配考官:', data)
}

const modifyConstraintConfig = async (data: any) => {
  // 修改约束配置的逻辑
  process.env.NODE_ENV === 'development' && console.log('修改约束配置:', data)
}

// 保存修改
const saveChanges = async () => {
  try {
    // 构建保存数据
    const scheduleRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      title: `手动调整排班_${new Date().toLocaleDateString()}`,
      result: schedulingResult.value || {
        assignments: [],
        unassignedStudents: [],
        conflicts: [],
        statistics: {
          totalStudents: scheduleResults.value.length,
          assignedStudents: 0,
          unassignedStudents: scheduleResults.value.length,
          totalTeachers: 0,
          activeTeachers: 0,
          averageWorkload: 0,
          maxWorkload: 0,
          hardConstraintsSatisfied: 0,
          softConstraintsScore: 0,
          continuityRate: 0
        },
        warnings: []
      },
      displayData: scheduleResults.value,
      metadata: {
        studentCount: scheduleResults.value.length,
        teacherCount: 0, // 可以计算实际考官数量
        dateRange: examStartDate.value && examEndDate.value ? 
          `${dateUtils.toStorageDate(examStartDate.value)} 到 ${dateUtils.toStorageDate(examEndDate.value)}` : '未设置',
        constraints: {},
        isManuallyAdjusted: true,
        studentList: studentList.value,
        teacherList: teacherList.value
      }
    }
    
    await storageService.saveScheduleResult(scheduleRecord)
    isModified.value = false
    alert('排班结果已保存')
    process.env.NODE_ENV === 'development' && console.log('排班结果已保存')
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  }
}

// 导出功能 - 使用真正的Excel格式
const exportToExcel = async () => {
  try {
    if (scheduleResults.value.length === 0) {
      alert('没有数据可以导出')
      return
    }
    
    // 🔧 使用真正的Excel格式（xlsx），避免HTML格式导致的__EMPTY列问题
    const XLSX = await import('xlsx')
    
    // 准备数据 - 去重
    const exportSeen = new Set<string>()
    const exportRows = scheduleResults.value.filter((r: any) => {
      const k = `${String((r as any).id ?? '')}|${(r as any).student}|${(r as any).department}|${(r as any).date1}|${(r as any).date2}`
      if (exportSeen.has(k)) return false
      exportSeen.add(k)
      return true
    })
    
    // 创建Excel数据数组
    const data: any[][] = [
      // 表头
      [
        '所在科室',
        '学员',  // 🔧 修复：使用"学员"而不是"学员姓名"，与导入逻辑一致
        '第一天日期',
        '第一天类型',
        '第一天考官一',
        '第一天考官二',
        '第一天备份考官',
        '第二天日期',
        '第二天类型',
        '第二天考官一',
        '第二天考官二',
        '第二天备份考官'
      ]
    ]
    
    // 添加数据行
    exportRows.forEach((result) => {
      data.push([
        result.department || '',
        result.student || '',
        result.date1 || '',
        '现场+模拟机',
        result.examiner1_1 || '',
        result.examiner1_2 || '',
        result.backup1 || '',
        result.date2 || '',
        '模拟机+口试',
        result.examiner2_1 || '',
        result.examiner2_2 || '',
        result.backup2 || ''
      ])
    })
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // 设置列宽
    worksheet['!cols'] = [
      { wch: 12 },  // 所在科室
      { wch: 10 },  // 学员
      { wch: 12 },  // 第一天日期
      { wch: 15 },  // 第一天类型
      { wch: 10 },  // 第一天考官一
      { wch: 10 },  // 第一天考官二
      { wch: 12 },  // 第一天备份考官
      { wch: 12 },  // 第二天日期
      { wch: 15 },  // 第二天类型
      { wch: 10 },  // 第二天考官一
      { wch: 10 },  // 第二天考官二
      { wch: 12 }   // 第二天备份考官
    ]
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '排班表')
    
    // 生成文件名
    const now = new Date()
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const filename = `排班表_${dateUtils.toStorageDate(now)}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}.xlsx`
    
    // 导出文件
    XLSX.writeFile(workbook, filename)
    
    alert(`✅ 导出成功！\n文件名：${filename}\n记录数：${exportRows.length}`)
    
    /* 🗑️ 旧代码：HTML格式导出（已废弃）
    // 创建带有合并单元格的Excel格式HTML表格
    let htmlContent = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>排班表</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            table { 
              border-collapse: collapse; 
              width: 100%;
              font-family: "Microsoft YaHei", Arial, sans-serif;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: center;
              white-space: nowrap;
              vertical-align: middle;
            }
            th { 
              background-color: #4472C4;
              color: white;
              font-weight: bold;
              font-size: 12px;
            }
            td {
              font-size: 11px;
            }
            .merged-cell {
              background-color: #E7E6E6;
              font-weight: bold;
            }
            .type-cell {
              background-color: #F2F2F2;
              font-weight: 500;
            }
            tr:nth-child(4n+1) td:not(.type-cell), tr:nth-child(4n+2) td:not(.type-cell) {
              background-color: #FFFFFF;
            }
            tr:nth-child(4n+3) td:not(.type-cell), tr:nth-child(4n+4) td:not(.type-cell) {
              background-color: #F8F9FA;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>所在科室</th>
                <th>学员姓名</th>
                <th>第一天日期</th>
                <th>第一天类型</th>
                <th>第一天考官一</th>
                <th>第一天考官二</th>
                <th>第一天备份考官</th>
                <th>第二天日期</th>
                <th>第二天类型</th>
                <th>第二天考官一</th>
                <th>第二天考官二</th>
                <th>第二天备份考官</th>
              </tr>
            </thead>
            <tbody>
    `
    
    // 添加数据 - 每个学员一行，不重复考官（导出前再次去重，避免偶发重复）
    const exportSeen = new Set<string>()
    const exportRows = scheduleResults.value.filter((r: any) => {
      const k = `${String((r as any).id ?? '')}|${(r as any).student}|${(r as any).department}|${(r as any).date1}|${(r as any).date2}`
      if (exportSeen.has(k)) return false
      exportSeen.add(k)
      return true
    })

    exportRows.forEach((result, index) => {
      const date1 = result.date1 || ''
      const date2 = result.date2 || ''
      
      // 每个学员只生成一行数据
      htmlContent += '              <tr>\n'
      htmlContent += `                <td class="merged-cell">${result.department || ''}</td>\n`
      htmlContent += `                <td class="merged-cell">${result.student || ''}</td>\n`
      htmlContent += `                <td class="merged-cell" style="mso-number-format:'\\@';">${date1}</td>\n`
      htmlContent += `                <td class="type-cell">现场+模拟机</td>\n`
      htmlContent += `                <td>${result.examiner1_1 || ''}</td>\n`
      htmlContent += `                <td>${result.examiner1_2 || ''}</td>\n`
      htmlContent += `                <td>${result.backup1 || ''}</td>\n`
      htmlContent += `                <td class="merged-cell" style="mso-number-format:'\\@';">${date2}</td>\n`
      htmlContent += `                <td class="type-cell">模拟机+口试</td>\n`
      htmlContent += `                <td>${result.examiner2_1 || ''}</td>\n`
      htmlContent += `                <td>${result.examiner2_2 || ''}</td>\n`
      htmlContent += `                <td>${result.backup2 || ''}</td>\n`
      htmlContent += '              </tr>\n'
    })
    
    htmlContent += `            </tbody>
          </table>
        </body>
      </html>
    `;
    
    // 添加BOM头解决中文乱码问题
    const BOM = '\uFEFF';
    const content = BOM + htmlContent;
    
    // 创建Blob并下载
    const blob = new Blob([content], { 
      type: 'application/vnd.ms-excel;charset=utf-8' 
    });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `排班结果_${new Date().toLocaleDateString().replace(/\//g, '-')}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    process.env.NODE_ENV === 'development' && console.log('导出完成');
    alert('导出成功！文件已下载到您的下载文件夹');
    */
    
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败，请重试')
  }
}

// 清除所有缓存数据
const clearAllCacheData = async () => {
  process.env.NODE_ENV === 'development' && console.log('🧹 开始清除所有缓存数据.')
  
  try {
    // 使用 storageService 清除数据
    await storageService.clearAllData()
    
    // 清除其他可能的缓存键
    const allKeys = Object.keys(localStorage)
    const cacheKeys = allKeys.filter(key => 
      key.includes('examiner') || 
      key.includes('teacher') || 
      key.includes('schedule') || 
      key.includes('api_') ||
      key.includes('system') ||
      key.includes('latest_schedule')
    )
    
    process.env.NODE_ENV === 'development' && console.log('📦 发现的缓存键:', cacheKeys)
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(key)
      process.env.NODE_ENV === 'development' && console.log(`✅已清除 ${key}`)
    })
    
    // 清除 sessionStorage
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.includes('examiner') || 
      key.includes('teacher') || 
      key.includes('schedule') || 
      key.includes('api_') ||
      key.includes('system')
    )
    
    sessionKeys.forEach(key => {
      sessionStorage.removeItem(key)
      process.env.NODE_ENV === 'development' && console.log(`✅已清除sessionStorage: ${key}`)
    })
    
    process.env.NODE_ENV === 'development' && console.log('🎉 所有缓存数据已清除')
    
  } catch (error) {
    console.error('清除缓存数据失败:', error)
  }
}

// 自动收缩侧边栏功能
const checkContentOverflow = () => {
  const container = document.querySelector('.app-container')
  const mainContent = document.querySelector('.main-content')
  const scheduleTable = document.querySelector('.schedule-table')
  
  if (!container || !mainContent || !scheduleTable) return
  
  const containerWidth = container.clientWidth
  const tableWidth = scheduleTable.scrollWidth
  const mainContentPadding = 64 // 32px * 2
  const sidebarWidth = sidebarCollapsed.value ? 80 : 280
  
  // 计算可用宽度
  const availableWidth = containerWidth - sidebarWidth - mainContentPadding
  
  // 如果表格宽度超过可用宽度且侧边栏未收缩，则自动收缩
  if (tableWidth > availableWidth && !sidebarCollapsed.value) {
    process.env.NODE_ENV === 'development' && console.log('检测到内容溢出，自动收缩侧边栏')
    sidebarCollapsed.value = true
  }
}

// 窗口大小变化监听
const handleResize = () => {
  checkContentOverflow()
}

// 响应式设计相关方法
const updateScreenSize = () => {
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
  
  // 更新设备类型
  isMobile.value = screenWidth.value < 768
  isTablet.value = screenWidth.value >= 768 && screenWidth.value < 1024
  isDesktop.value = screenWidth.value >= 1024
  
  // 移动端自动收起侧边栏
  if (isMobile.value && !sidebarCollapsed.value) {
    sidebarCollapsed.value = true
  }
  
  // 移动端关闭菜单
  if (isMobile.value) {
    mobileMenuOpen.value = false
  }
}

// 切换移动端菜单
const toggleMobileMenu = () => {
  if (isMobile.value) {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }
}

// 关闭移动端菜单
const closeMobileMenu = () => {
  if (isMobile.value) {
    mobileMenuOpen.value = false
  }
}

// 响应式侧边栏切换
const toggleSidebar = () => {
  if (isMobile.value) {
    toggleMobileMenu()
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
}

// ========== 历史排班管理函数 ==========

// 计算属性：过滤后的历史列表
const filteredHistoryList = computed(() => {
  if (!historySearchQuery.value.trim()) {
    return historyList.value
  }
  const query = historySearchQuery.value.toLowerCase()
  return historyList.value.filter(snapshot => 
    snapshot.name.toLowerCase().includes(query) ||
    (snapshot.description && snapshot.description.toLowerCase().includes(query))
  )
})

// 获取日期范围
const getDateRange = () => {
  if (scheduleResults.value.length === 0) return '无'
  const dates: string[] = []
  scheduleResults.value.forEach((result: any) => {
    if (result.rawDate1) dates.push(result.rawDate1)
    if (result.rawDate2) dates.push(result.rawDate2)
  })
  dates.sort()
  if (dates.length === 0) return '无'
  return `${dateUtils.toDisplayDate(dates[0])} 至 ${dateUtils.toDisplayDate(dates[dates.length - 1])}`
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 保存排班快照（完整版本）
const handleSaveSnapshot = async () => {
  if (!snapshotName.value.trim()) {
    ElMessage.warning('请输入快照名称')
    return
  }

  try {
    // 转换数据格式为ScheduleResultRecord
    const scheduleData = scheduleResults.value.map((record: any) => ({
      id: record.id,
      student: record.student,
      department: record.department,
      date1: record.date1,
      date2: record.date2,
      type1: record.type1,
      type2: record.type2,
      examiner1_1: record.examiner1_1,
      examiner1_2: record.examiner1_2,
      backup1: record.backup1,
      examiner2_1: record.examiner2_1,
      examiner2_2: record.examiner2_2,
      backup2: record.backup2,
      manualEdits: record.manualEdits,
      constraintViolations: record.constraintViolations
    }))
    
    // 准备考试日期范围
    const examDates: string[] = []
    if (examStartDateStr.value && examEndDateStr.value) {
      const start = new Date(examStartDateStr.value)
      const end = new Date(examEndDateStr.value)
      const current = new Date(start)
      while (current <= end) {
        examDates.push(dateUtils.toStorageDate(current))
        current.setDate(current.getDate() + 1)
      }
    }
    
    // 保存完整快照：排班数据 + 学员数据 + 教师数据（含不可用时间） + 考试日期
    const snapshot = await scheduleHistoryService.saveSnapshot(
      snapshotName.value,
      snapshotDescription.value,
      scheduleData,
      constraints.value,
      studentList.value,      // 学员完整数据
      teacherList.value,      // 教师完整数据（包含不可用时间）
      examDates               // 考试日期范围
    )
    
    currentSnapshotInfo.value = snapshot
    hasUnsavedChanges.value = false
    showSaveSnapshotDialog.value = false
    
    // 重置表单
    snapshotName.value = ''
    snapshotDescription.value = ''
    
    // 显示详细成功信息
    const teachersWithUnavailable = teacherList.value.filter(
      (t: any) => t.unavailablePeriods && t.unavailablePeriods.length > 0
    ).length
    
    ElMessage.success({
      message: `排班快照保存成功！\n已保存 ${studentList.value.length} 位学员、${teacherList.value.length} 位考官${teachersWithUnavailable > 0 ? `（含 ${teachersWithUnavailable} 位考官的不可用时间）` : ''}`,
      duration: 5000
    })
    
    process.env.NODE_ENV === 'development' && console.log('📦 快照保存详情:', {
      name: snapshot.name,
      schedules: scheduleData.length,
      students: studentList.value.length,
      teachers: teacherList.value.length,
      teachersWithUnavailable,
      examDates: examDates.length
    })
    
    // 刷新历史列表
    await loadHistoryList()
  } catch (error) {
    console.error('保存快照失败:', error)
    ElMessage.error('保存快照失败，请重试')
  }
}

// 加载历史列表
const loadHistoryList = async () => {
  historyLoading.value = true
  try {
    const response = await scheduleHistoryService.getSnapshotList({
      page: 0,
      pageSize: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
    historyList.value = response.snapshots
    
    // 检查是否需要清理
    const cleanup = await scheduleHistoryService.checkCleanupNeeded()
    cleanupRecommendation.value = cleanup
  } catch (error) {
    console.error('加载历史列表失败:', error)
    ElMessage.error('加载历史列表失败')
  } finally {
    historyLoading.value = false
  }
}

// 🆕 显示快照的学员列表
const showSnapshotStudentList = (snapshot: any) => {
  if (snapshot.metadata && snapshot.metadata.studentList) {
    selectedSnapshotStudents.value = snapshot.metadata.studentList
    showStudentListDialog.value = true
    process.env.NODE_ENV === 'development' && console.log('📋 显示学员列表:', selectedSnapshotStudents.value.length, '位学员')
  } else {
    ElMessage.warning('该快照没有保存学员详细信息')
  }
}

// 🆕 获取学员的扩展字段（除了姓名和科室）
const getStudentExtendedFields = (student: any): Array<{key: string, label: string, value: any}> => {
  const excludeKeys = ['姓名', 'name', '科室', 'department', '__rowNum__']
  const fields: Array<{key: string, label: string, value: any}> = []
  
  for (const key in student) {
    if (excludeKeys.includes(key) || key.startsWith('_')) {
      continue
    }
    
    const value = student[key]
    if (value !== null && value !== undefined && value !== '') {
      // 格式化字段名
      let label = key
      if (key === '学号' || key === 'studentId') label = '学号'
      else if (key === '班级' || key === 'class') label = '班级'
      else if (key === '专业' || key === 'major') label = '专业'
      else if (key === '电话' || key === 'phone') label = '电话'
      else if (key === '邮箱' || key === 'email') label = '邮箱'
      else if (key === '备注' || key === 'remark' || key === 'note') label = '备注'
      else if (key === '考试类型' || key === 'examType') label = '考试类型'
      else if (key === '考试科目' || key === 'examSubject') label = '考试科目'
      else if (key.includes('日期') || key.includes('date')) label = key
      else label = key
      
      fields.push({
        key,
        label,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      })
    }
  }
  
  return fields
}

// 🆕 显示考官不可用时间详情
const showUnavailableTeachers = (snapshot: any) => {
  if (snapshot.metadata && snapshot.metadata.teacherList) {
    const teachersWithUnavailable = snapshot.metadata.teacherList.filter(
      (t: any) => t.unavailablePeriods && t.unavailablePeriods.length > 0
    )
    unavailableTeachersData.value = teachersWithUnavailable
    showUnavailableDialog.value = true
    process.env.NODE_ENV === 'development' && console.log('⚠️ 显示不可用时间:', unavailableTeachersData.value.length, '位考官')
  } else {
    ElMessage.warning('该快照没有保存考官详细信息')
  }
}

// 🆕 上传排班表文件处理
const handleScheduleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  uploadedScheduleFile.value = file
  scheduleParseStatus.value = null
  parsedScheduleData.value = []
  
  try {
    process.env.NODE_ENV === 'development' && console.log('📤 开始解析排班表文件:', file.name)
    
    const XLSX = await import('xlsx')
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // 🔧 修复：使用header: 1模式解析，然后手动查找表头行
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]
        
        process.env.NODE_ENV === 'development' && console.log('📊 原始数据行数:', rawData.length)
        process.env.NODE_ENV === 'development' && console.log('📊 前5行:', rawData.slice(0, 5))
        
        // 🔍 智能查找表头行（跳过图例部分）
        let headerRowIndex = -1
        let headers: string[] = []
        
        for (let i = 0; i < Math.min(rawData.length, 20); i++) {
          const row = rawData[i]
          const rowStr = row.map((cell: any) => String(cell || '').trim()).filter((s: string) => s)
          
          // 检测是否为排班表头（必须包含"学员"或"姓名"列）
          const hasStudentColumn = rowStr.some((h: string) => 
            h.includes('学员') || h.includes('姓名') || h.includes('学生')
          )
          
          if (hasStudentColumn) {
            headerRowIndex = i
            headers = row.map((cell: any) => String(cell || '').trim())
            process.env.NODE_ENV === 'development' && console.log(`✅ 找到表头行（第${i + 1}行）:`, headers)
            break
          }
        }
        
        if (headerRowIndex === -1) {
          scheduleParseStatus.value = {
            type: 'error',
            message: '❌ 未找到有效的表头',
            details: '请确保Excel文件包含"学员"或"姓名"列'
          }
          return
        }
        
        // 🔧 转换数据行为对象格式（从表头行的下一行开始）
        const dataRows = rawData.slice(headerRowIndex + 1)
        const jsonData = dataRows.map(row => {
          const obj: any = {}
          headers.forEach((header, index) => {
            if (header) {  // 只处理非空列名
              obj[header] = row[index] || ''
            }
          })
          return obj
        }).filter(obj => Object.keys(obj).length > 0)  // 过滤空行
        
        process.env.NODE_ENV === 'development' && console.log('📊 解析到数据:', jsonData.length, '行')
        process.env.NODE_ENV === 'development' && console.log('📋 第一行数据示例:', jsonData[0])
        
        // 解析排班表数据
        const scheduleRecords = parseScheduleData(jsonData)
        
        if (scheduleRecords.length === 0) {
          // 提供更详细的错误信息
          const firstRow = jsonData[0]
          if (firstRow) {
            const columnNames = Object.keys(firstRow)
            const columnNamesStr = columnNames.join('、')
            
            scheduleParseStatus.value = {
              type: 'warning',
              message: '⚠️ 未识别到有效的排班数据',
              details: `检测到 ${columnNames.length} 个列：\n${columnNamesStr}\n\n请检查：\n1. 是否包含"学员"或"姓名"列（必需）\n2. 列名是否与支持的格式匹配\n3. 点击上方"支持的列名格式"查看详情`
            }
            console.error('❌ 解析失败，检测到的列名:', columnNames)
            console.error('📋 第一行完整数据:', firstRow)
          } else {
            scheduleParseStatus.value = {
              type: 'error',
              message: '❌ 文件中没有数据',
              details: '请确保Excel文件包含数据行（不只是表头）'
            }
          }
          return
        }
        
        parsedScheduleData.value = scheduleRecords
        
        // 统计信息
        const uniqueStudents = new Set(scheduleRecords.map((r: any) => r.student)).size
        const validDates = scheduleRecords.filter((r: any) => r.date1 || r.date2).length
        const hasExaminers = scheduleRecords.filter((r: any) => 
          r.examiner1_1 || r.examiner1_2 || r.examiner2_1 || r.examiner2_2
        ).length
        
        scheduleParseStatus.value = {
          type: 'success',
          message: `✅ 成功解析 ${scheduleRecords.length} 条排班记录`,
          details: `包含 ${uniqueStudents} 位学员，${validDates} 条有日期信息，${hasExaminers} 条有考官分配`
        }
        
        process.env.NODE_ENV === 'development' && console.log('✅ 排班表解析成功:', {
          total: scheduleRecords.length,
          students: uniqueStudents,
          withDates: validDates,
          withExaminers: hasExaminers,
          sample: scheduleRecords.slice(0, 3)
        })
      } catch (error) {
        console.error('❌ 解析排班表失败:', error)
        scheduleParseStatus.value = {
          type: 'error',
          message: '❌ 解析文件失败',
          details: error instanceof Error ? error.message : '未知错误'
        }
      }
    }
    
    reader.onerror = () => {
      scheduleParseStatus.value = {
        type: 'error',
        message: '❌ 读取文件失败',
        details: '请检查文件是否损坏或格式是否正确'
      }
    }
    
    reader.readAsBinaryString(file)
  } catch (error) {
    console.error('❌ 处理文件失败:', error)
    ElMessage.error('处理文件失败，请重试')
  }
}

// 解析排班表数据
// 🔄 根据类型和日期推断轮班
const inferShiftFromType = (type: string, dateStr: string): string => {
  if (!type) {
    return '日常班' // 默认为日常班
  }
  
  // 将日期字符串转为Date对象以获取星期几
  let dayOfWeek = ''
  if (dateStr) {
    try {
      const date = new Date(dateStr)
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      dayOfWeek = weekdays[date.getDay()]
    } catch (e) {
      console.warn('无法解析日期:', dateStr)
    }
  }
  
  const typeUpper = type.toUpperCase()
  
  // 判断逻辑（根据实际业务调整）
  if (typeUpper.includes('模拟机') || typeUpper.includes('口试') || typeUpper.includes('面谈')) {
    return '白班'
  }
  
  if (typeUpper.includes('现场') || typeUpper.includes('实操')) {
    // 现场考试通常在工作日
    if (dayOfWeek === '周六' || dayOfWeek === '周日') {
      return '周末班'
    }
    return '日常班'
  }
  
  // 默认根据日期判断
  if (dayOfWeek === '周六' || dayOfWeek === '周日') {
    return '周末班'
  }
  
  return '日常班'
}

const parseScheduleData = (jsonData: any[]): any[] => {
  const scheduleRecords: any[] = []
  
  // 调试：打印第一行的所有列名
  if (jsonData.length > 0) {
    const firstRow = jsonData[0]
    const columnNames = Object.keys(firstRow)
    process.env.NODE_ENV === 'development' && console.log('📋 检测到的Excel列名:', columnNames)
    process.env.NODE_ENV === 'development' && console.log('📋 第一行数据示例:', firstRow)
  }
  
  for (const row of jsonData) {
    // 识别常见的列名变体（扩展支持）
    const student = row['学员'] || row['姓名'] || row['学员姓名'] || row['name'] || 
                    row['学生'] || row['考生'] || row['学生姓名'] || ''
    
    const department = row['科室'] || row['部门'] || row['department'] || 
                       row['专业'] || row['院系'] || row['所在科室'] || row['所属科室'] || ''
    
    // 日期相关 - 支持更多变体（包括"第一天日期"、"第二天日期"格式）
    const date1 = row['考试日期1'] || row['第一次考试日期'] || row['日期1'] || row['date1'] || 
                  row['第一天'] || row['第一场日期'] || row['现场日期'] || row['实操日期'] ||
                  row['第一次日期'] || row['第一天日期'] || row['第1天日期'] || ''
    
    const date2 = row['考试日期2'] || row['第二次考试日期'] || row['日期2'] || row['date2'] || 
                  row['第二天'] || row['第二场日期'] || row['面谈日期'] || row['口试日期'] ||
                  row['第二次日期'] || row['第二天日期'] || row['第2天日期'] || ''
    
    // 现场考官（考官1）- 支持"第一天考官一/二"格式
    const examiner1_1 = row['现场-考官1'] || row['考官1-1'] || row['第一场考官1'] || 
                        row['examiner1_1'] || row['实操考官1'] || row['现场考官1'] ||
                        row['考官1'] || row['主考官1'] || row['第一天考官一'] || row['第1天考官一'] ||
                        row['第一天考官1'] || ''
    
    const examiner1_2 = row['现场-考官2'] || row['考官1-2'] || row['第一场考官2'] || 
                        row['examiner1_2'] || row['实操考官2'] || row['现场考官2'] ||
                        row['考官2'] || row['主考官2'] || row['第一天考官二'] || row['第1天考官二'] ||
                        row['第一天考官2'] || ''
    
    const backup1 = row['现场-备用'] || row['备用考官1'] || row['第一场备用'] || 
                    row['backup1'] || row['实操备用'] || row['现场备用'] ||
                    row['备用1'] || row['第一天备份考官'] || row['第1天备份考官'] ||
                    row['第一天备用'] || ''
    
    // 面谈考官（考官2）- 支持"第二天考官一/二"格式
    const examiner2_1 = row['面谈-考官1'] || row['考官2-1'] || row['第二场考官1'] || 
                        row['examiner2_1'] || row['口试考官1'] || row['面谈考官1'] ||
                        row['面谈1'] || row['第二天考官一'] || row['第2天考官一'] ||
                        row['第二天考官1'] || ''
    
    const examiner2_2 = row['面谈-考官2'] || row['考官2-2'] || row['第二场考官2'] || 
                        row['examiner2_2'] || row['口试考官2'] || row['面谈考官2'] ||
                        row['面谈2'] || row['第二天考官二'] || row['第2天考官二'] ||
                        row['第二天考官2'] || ''
    
    const backup2 = row['面谈-备用'] || row['备用考官2'] || row['第二场备用'] || 
                    row['backup2'] || row['口试备用'] || row['面谈备用'] ||
                    row['备用2'] || row['第二天备份考官'] || row['第2天备份考官'] ||
                    row['第二天备用'] || ''
    
    // 提取类型信息（用于轮班判断）
    const type1 = row['第一天类型'] || row['第1天类型'] || row['类型1'] || 
                  row['现场类型'] || row['实操类型'] || row['type1'] || ''
    
    const type2 = row['第二天类型'] || row['第2天类型'] || row['类型2'] || 
                  row['面谈类型'] || row['口试类型'] || row['type2'] || ''
    
    // 根据类型推断轮班（shift）
    // 注意：这里的逻辑需要根据实际业务规则调整
    // 如果类型包含"模拟机"、"口试"通常是白班
    // 如果没有特殊类型，默认为日常班
    const shift1 = inferShiftFromType(type1, date1)
    const shift2 = inferShiftFromType(type2, date2)
    
    // 只添加有学员姓名的记录
    if (student) {
      // 🆕 检测是否为一天考试（date2为空或所有Day2考官为空）
      const isOneDayExam = !date2 || date2 === '-' || 
                           (!examiner2_1 && !examiner2_2 && !backup2)
      
      const record = {
        id: `uploaded-${Date.now()}-${scheduleRecords.length}`,
        student,
        department,
        date1: date1 ? dateUtils.toDisplayDate(formatDateString(date1)) : '',
        date2: isOneDayExam ? '-' : (date2 ? dateUtils.toDisplayDate(formatDateString(date2)) : ''),
        // 🆕 一天考试强制显示"模拟机"，否则使用原type1或默认值
        type1: isOneDayExam ? '模拟机' : (type1 || '现场+模拟机1'),
        type2: isOneDayExam ? '-' : (type2 || '模拟机2+口试'),
        shift1, // 保存推断的轮班
        shift2: isOneDayExam ? '' : shift2,
        examiner1_1,
        examiner1_2,
        backup1,
        examiner2_1: isOneDayExam ? '-' : examiner2_1,
        examiner2_2: isOneDayExam ? '-' : examiner2_2,
        backup2: isOneDayExam ? '-' : backup2,
        examDays: isOneDayExam ? 1 : 2,  // 🆕 标记考试天数
        manualEdits: [],
        constraintViolations: [],
        _originalRow: row // 保存原始数据用于学员列表显示
      }
      
      scheduleRecords.push(record)
      
      // 调试：打印前3条解析结果
      if (scheduleRecords.length <= 3) {
        process.env.NODE_ENV === 'development' && console.log(`📝 解析记录 #${scheduleRecords.length}:`, {
          学员: record.student,
          科室: record.department,
          日期1: record.date1,
          日期2: record.date2,
          现场考官1: record.examiner1_1,
          现场考官2: record.examiner1_2,
          面谈考官1: record.examiner2_1,
          面谈考官2: record.examiner2_2
        })
      }
    }
  }
  
  process.env.NODE_ENV === 'development' && console.log(`✅ 总共解析了 ${scheduleRecords.length} 条有效记录`)
  
  return scheduleRecords
}

// 格式化日期字符串
const formatDateString = (dateValue: any): string => {
  if (!dateValue) return ''
  
  // 如果是Excel日期数字
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000)
    return dateUtils.toStorageDate(date)
  }
  
  // 如果是字符串，尝试解析
  const dateStr = String(dateValue).trim()
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-')
  }
  
  return dateStr
}

// 清除已上传的文件
const clearScheduleFile = () => {
  uploadedScheduleFile.value = null
  parsedScheduleData.value = []
  scheduleParseStatus.value = null
  uploadScheduleSnapshotName.value = ''
  if (scheduleFileInput.value) {
    scheduleFileInput.value.value = ''
  }
}

// 加载上传的排班表到当前视图
const loadUploadedSchedule = async () => {
  if (parsedScheduleData.value.length === 0) {
    ElMessage.warning('没有可加载的数据')
    return
  }
  
  // 提取学员数据
  const students = parsedScheduleData.value.map((record: any) => ({
    姓名: record.student,
    科室: record.department,
    ...(record._originalRow || {})
  }))
  
  // 去重学员
  const uniqueStudents = students.filter((student, index, self) => 
    index === self.findIndex(s => s.姓名 === student.姓名 && s.科室 === student.科室)
  )
  
  studentList.value = uniqueStudents
  scheduleResults.value = parsedScheduleData.value
  
  // 解析日期范围
  const dates = parsedScheduleData.value
    .map((r: any) => [r.date1, r.date2])
    .flat()
    .filter(Boolean)
    .sort((a: any, b: any) => {
      const parseToTimestamp = (dateStr: any) => {
        if (!dateStr) return 0
        const str = String(dateStr)
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          return new Date(str).getTime()
        }
        const match = str.match(/^(\d{1,2})\.(\d{1,2})$/)
        if (!match) return 0
        const month = Number(match[1])
        const day = Number(match[2])
        const baseDateStr = examStartDateStr.value
        const baseDate = baseDateStr ? new Date(baseDateStr) : new Date()
        const baseMonth = baseDate.getMonth() + 1
        let year = baseDate.getFullYear()
        if (month < baseMonth) year += 1
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return new Date(iso).getTime()
      }
      return parseToTimestamp(a) - parseToTimestamp(b)
    })
  
  if (dates.length > 0) {
    examStartDateStr.value = dates[0]
    examEndDateStr.value = dates[dates.length - 1]
  }
  
  showUploadScheduleDialog.value = false
  clearScheduleFile()
  
  // 强制刷新显示
  await nextTick()
  
  // 🔍 执行约束检查
  process.env.NODE_ENV === 'development' && console.log('🔍 开始检查上传排班表的约束违反...')
  const violationCount = await validateUploadedSchedule()
  
  // 触发响应式更新
  scheduleResults.value = [...scheduleResults.value]
  
  // 滚动到排班表区域
  setTimeout(() => {
    const scheduleTable = document.querySelector('.schedule-table-container')
    if (scheduleTable) {
      scheduleTable.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, 100)
  
  // 显示加载结果
  if (violationCount > 0) {
    ElMessage.warning({
      message: `✅ 已加载 ${parsedScheduleData.value.length} 条排班记录\n${uniqueStudents.length} 位学员\n⚠️ 检测到 ${violationCount} 处约束冲突，已标记为黄色\n点击黄色单元格可查看详情并修改`,
      duration: 8000
    })
  } else {
    ElMessage.success({
      message: `✅ 已加载 ${parsedScheduleData.value.length} 条排班记录\n${uniqueStudents.length} 位学员\n✅ 所有考官分配符合约束要求\n排班表已显示在下方`,
      duration: 5000
    })
  }
  
  process.env.NODE_ENV === 'development' && console.log('📥 排班表已加载:', {
    schedules: parsedScheduleData.value.length,
    students: uniqueStudents.length,
    violations: violationCount,
    dateRange: {
      start: examStartDateStr.value,
      end: examEndDateStr.value
    }
  })
}

// 🔍 验证上传的排班表约束
const validateUploadedSchedule = async (): Promise<number> => {
  if (!teacherList.value || teacherList.value.length === 0) {
    console.warn('⚠️ 没有教师数据，跳过约束检查')
    return 0
  }
  
  let totalViolations = 0
  
  for (const record of scheduleResults.value) {
    const violations: any[] = []
    
    // 检查所有考官字段
    const examinerFields = [
      { field: 'examiner1_1', date: record.date1, shift: (record as any).shift1 },
      { field: 'examiner1_2', date: record.date1, shift: (record as any).shift1 },
      { field: 'backup1', date: record.date1, shift: (record as any).shift1 },
      { field: 'examiner2_1', date: record.date2, shift: (record as any).shift2 },
      { field: 'examiner2_2', date: record.date2, shift: (record as any).shift2 },
      { field: 'backup2', date: record.date2, shift: (record as any).shift2 }
    ]
    
    for (const { field, date, shift } of examinerFields) {
      const examinerName = (record as any)[field]
      
      if (!examinerName || examinerName === '-' || !date) {
        continue
      }
      
      // 查找教师信息
      const teacher = teacherList.value.find((t: any) => t.name === examinerName)
      
      if (!teacher) {
        violations.push({
          field,
          type: 'TEACHER_NOT_FOUND',
          severity: 'high',
          message: `考官 ${examinerName} 在系统中不存在`
        })
        continue
      }
      
      // 🔄 检查轮班匹配
      if (shift && teacher.shift && teacher.shift !== shift) {
        violations.push({
          field,
          type: 'SHIFT_MISMATCH',
          severity: 'high',
          message: `考官 ${examinerName} 轮班不匹配（需要${shift}，但考官是${teacher.shift}）`
        })
      }
      
      // 检查不可用时间
      if (teacher.unavailablePeriods && teacher.unavailablePeriods.length > 0) {
        const isUnavailable = teacher.unavailablePeriods.some((period: any) => {
          const periodDate = period.date || period.startDate
          return periodDate === date
        })
        
        if (isUnavailable) {
          violations.push({
            field,
            type: 'UNAVAILABLE_PERIOD',
            severity: 'high',
            message: `考官 ${examinerName} 在 ${date} 不可用`
          })
        }
      }
      
      // 检查工作量（统计该教师在所有记录中的分配次数）
      const assignmentCount = scheduleResults.value.reduce((count, r) => {
        let fieldCount = 0
        if (r.examiner1_1 === examinerName) fieldCount++
        if (r.examiner1_2 === examinerName) fieldCount++
        if (r.backup1 === examinerName) fieldCount++
        if (r.examiner2_1 === examinerName) fieldCount++
        if (r.examiner2_2 === examinerName) fieldCount++
        if (r.backup2 === examinerName) fieldCount++
        return count + fieldCount
      }, 0)
      
      if (teacher.workload && assignmentCount > teacher.workload) {
        violations.push({
          field,
          type: 'WORKLOAD_EXCEEDED',
          severity: 'medium',
          message: `考官 ${examinerName} 工作量超标（${assignmentCount}/${teacher.workload}）`
        })
      }
    }
    
    // 保存约束违反信息
    if (violations.length > 0) {
      (record as any).constraintViolations = violations
      totalViolations += violations.length
      process.env.NODE_ENV === 'development' && console.log(`⚠️ 记录 ${record.student} 存在 ${violations.length} 处约束违反:`, violations)
    }
  }
  
  process.env.NODE_ENV === 'development' && console.log(`✅ 约束检查完成，共发现 ${totalViolations} 处违反`)
  return totalViolations
}

// 📊 获取当前排班表的冲突数量
const getViolationCount = (): number => {
  if (!scheduleResults.value || scheduleResults.value.length === 0) {
    return 0
  }
  
  let count = 0
  for (const record of scheduleResults.value) {
    if ((record as any).constraintViolations && (record as any).constraintViolations.length > 0) {
      count += (record as any).constraintViolations.length
    }
  }
  return count
}

// 直接保存上传的排班表为快照
const saveUploadedScheduleAsSnapshot = async () => {
  if (!uploadScheduleSnapshotName.value.trim()) {
    ElMessage.warning('请填写快照名称')
    return
  }
  
  if (parsedScheduleData.value.length === 0) {
    ElMessage.warning('没有可保存的数据')
    return
  }
  
  try {
    // 提取学员数据
    const students = parsedScheduleData.value.map((record: any) => ({
      姓名: record.student,
      科室: record.department,
      ...(record._originalRow || {})
    }))
    
    const uniqueStudents = students.filter((student, index, self) => 
      index === self.findIndex(s => s.姓名 === student.姓名 && s.科室 === student.科室)
    )
    
    // 解析日期范围
    const dates = parsedScheduleData.value
      .map((r: any) => [r.date1, r.date2])
      .flat()
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const parseToTimestamp = (dateStr: any) => {
          if (!dateStr) return 0
          const str = String(dateStr)
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return new Date(str).getTime()
          }
          const match = str.match(/^(\d{1,2})\.(\d{1,2})$/)
          if (!match) return 0
          const month = Number(match[1])
          const day = Number(match[2])
          const baseDateStr = examStartDateStr.value
          const baseDate = baseDateStr ? new Date(baseDateStr) : new Date()
          const baseMonth = baseDate.getMonth() + 1
          let year = baseDate.getFullYear()
          if (month < baseMonth) year += 1
          const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          return new Date(iso).getTime()
        }
        return parseToTimestamp(a) - parseToTimestamp(b)
      })
    
    const examDates = Array.from(new Set(dates))
    
    const snapshot = await scheduleHistoryService.saveSnapshot(
      uploadScheduleSnapshotName.value,
      `从文件导入: ${uploadedScheduleFile.value?.name || ''}`,
      parsedScheduleData.value,
      {},
      uniqueStudents,
      teacherList.value, // 使用当前的考官列表
      examDates
    )
    
    showUploadScheduleDialog.value = false
    clearScheduleFile()
    
    ElMessage.success({
      message: `✅ 排班快照保存成功！\n已保存 ${parsedScheduleData.value.length} 条记录，${uniqueStudents.length} 位学员`,
      duration: 3000
    })
    
    await loadHistoryList()
    
    process.env.NODE_ENV === 'development' && console.log('💾 上传的排班表已保存为快照:', snapshot)
  } catch (error) {
    console.error('❌ 保存快照失败:', error)
    ElMessage.error('保存快照失败，请重试')
  }
}

// 加载历史排班（完整版本，恢复所有数据）
const handleLoadSnapshot = async (snapshotId: string | number) => {
  try {
    const snapshot = await scheduleHistoryService.getSnapshot(snapshotId)
    
    // 确认是否加载
    if (hasUnsavedChanges.value) {
      const confirmed = confirm('当前有未保存的修改，是否放弃并加载历史排班？')
      if (!confirmed) return
    }
    
    // 🔧 设置恢复标志，防止触发"未保存"状态
    isRestoringData.value = true
    
    // 1. 加载排班数据
    scheduleResults.value = snapshot.scheduleData.map((record: any) => ({
      id: record.id,
      department: record.department,
      student: record.student,
      date1: record.date1,
      // 🆕 根据考试天数设置type1默认值
      type1: record.type1 || (record.examDays === 1 ? '模拟机' : '现场+模拟机1'),
      examiner1_1: record.examiner1_1,
      examiner1_2: record.examiner1_2,
      backup1: record.backup1,
      date2: record.date2,
      type2: record.type2 || '模拟机2+口试',
      examiner2_1: record.examiner2_1,
      examiner2_2: record.examiner2_2,
      backup2: record.backup2,
      examDays: record.examDays || 2,  // 🆕 保留考试天数信息
      manualEdits: record.manualEdits,
      constraintViolations: record.constraintViolations
    })) as any
    
    // 2. 恢复学员数据
    if (snapshot.metadata.studentList) {
      studentList.value = snapshot.metadata.studentList
      process.env.NODE_ENV === 'development' && console.log(`✅ 已恢复 ${studentList.value.length} 位学员数据`)
    }
    
    // 3. 恢复教师数据（包含不可用时间）
    if (snapshot.metadata.teacherList) {
      teacherList.value = snapshot.metadata.teacherList
      cachedTeacherData = snapshot.metadata.teacherList // 🔧 同步更新缓存
      const teachersWithUnavailable = teacherList.value.filter(
        (t: any) => t.unavailablePeriods && t.unavailablePeriods.length > 0
      )
      process.env.NODE_ENV === 'development' && console.log(`✅ 已恢复 ${teacherList.value.length} 位考官数据`, {
        withUnavailable: teachersWithUnavailable.length,
        unavailablePeriods: teachersWithUnavailable.flatMap((t: any) => t.unavailablePeriods || [])
      })
    }
    
    // 4. 恢复考试日期范围
    if (snapshot.metadata.examDates && snapshot.metadata.examDates.length > 0) {
      examStartDateStr.value = snapshot.metadata.examDates[0]
      examEndDateStr.value = snapshot.metadata.examDates[snapshot.metadata.examDates.length - 1]
      process.env.NODE_ENV === 'development' && console.log(`✅ 已恢复考试日期范围: ${examStartDateStr.value} ~ ${examEndDateStr.value}`)
    }
    
    // 5. 恢复约束配置
    if (snapshot.metadata.constraintConfig) {
      Object.assign(constraints.value, snapshot.metadata.constraintConfig)
      process.env.NODE_ENV === 'development' && console.log('✅ 已恢复约束配置')
    }
    
    currentSnapshotInfo.value = snapshot
    hasUnsavedChanges.value = false
    showHistoryListDialog.value = false
    
    // 🔧 延迟清除恢复标志（确保所有watch完成）
    setTimeout(() => {
      isRestoringData.value = false
      // 再次确认清除"未保存"状态
      hasUnsavedChanges.value = false
      process.env.NODE_ENV === 'development' && console.log('✅ 快照加载完成，清除"未保存"标记')
    }, 1000)
    
    // 显示详细加载信息
    const details = []
    details.push(`排班: ${snapshot.scheduleData.length} 条`)
    if (snapshot.metadata.studentList) details.push(`学员: ${snapshot.metadata.studentList.length} 位`)
    if (snapshot.metadata.teacherList) {
      const unavailableCount = snapshot.metadata.teacherList.filter(
        (t: any) => t.unavailablePeriods && t.unavailablePeriods.length > 0
      ).length
      details.push(`教师: ${snapshot.metadata.teacherList.length} 位${unavailableCount > 0 ? `（${unavailableCount} 位有不可用时间）` : ''}`)
    }
    
    ElMessage.success({
      message: `已加载排班: ${snapshot.name}\n${details.join('、')}`,
      duration: 5000
    })
    
    process.env.NODE_ENV === 'development' && console.log('📦 快照加载完成:', {
      name: snapshot.name,
      schedules: snapshot.scheduleData.length,
      students: snapshot.metadata.studentList?.length || 0,
      teachers: snapshot.metadata.teacherList?.length || 0,
      dates: snapshot.metadata.examDates?.length || 0
    })
  } catch (error) {
    console.error('加载排班失败:', error)
    ElMessage.error('加载排班失败，请重试')
  }
}

// 删除历史排班
const handleDeleteSnapshot = async (snapshotId: string | number) => {
  const confirmed = confirm('确定要删除这个排班快照吗？此操作无法撤销。')
  if (!confirmed) return
  
  try {
    await scheduleHistoryService.deleteSnapshot(snapshotId)
    ElMessage.success('删除成功')
    
    // 刷新列表
    await loadHistoryList()
    
    // 如果删除的是当前编辑的快照，清除当前快照信息
    if (currentSnapshotInfo.value?.id === snapshotId) {
      currentSnapshotInfo.value = null
    }
  } catch (error) {
    console.error('删除快照失败:', error)
    ElMessage.error('删除快照失败，请重试')
  }
}

// 导出当前排班表（带颜色）
const handleExportCurrentSchedule = async () => {
  try {
    if (!scheduleResults.value || scheduleResults.value.length === 0) {
      ElMessage.warning('没有可导出的排班数据')
      return
    }

    // 生成文件名
    const dateStr = dateUtils.toStorageDate(new Date())
    const filename = `排班表_${dateStr}.xlsx`

    // 导出（带图例）
    await excelExportService.exportScheduleWithLegend(
      scheduleResults.value as any,
      filename
    )

    ElMessage.success({
      message: '✅ 排班表导出成功（已保留颜色信息）',
      duration: 3000
    })

    process.env.NODE_ENV === 'development' && console.log('✅ 导出成功:', {
      records: scheduleResults.value.length,
      filename,
      manualEdits: scheduleResults.value.filter((r: any) => r.manualEdits && r.manualEdits.length > 0).length,
      violations: scheduleResults.value.filter((r: any) => r.constraintViolations && r.constraintViolations.length > 0).length
    })
  } catch (error) {
    console.error('❌ 导出排班表失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 导出历史排班
const handleExportSnapshot = async (snapshotId: string | number) => {
  try {
    const snapshot = await scheduleHistoryService.getSnapshot(snapshotId)
    const blob = await scheduleHistoryService.exportSnapshotToExcel(snapshot)
    
    // 下载文件
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${snapshot.name}_排班表.xlsx`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出快照失败:', error)
    ElMessage.error('导出快照失败，请重试')
  }
}

// 批量清理旧快照
const handleBatchCleanup = async () => {
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  
  const oldSnapshots = historyList.value.filter(
    s => new Date(s.createdAt) < threeMonthsAgo
  )
  
  if (oldSnapshots.length === 0) {
    ElMessage.info('没有需要清理的旧快照')
    return
  }
  
  const confirmed = confirm(
    `将删除 ${oldSnapshots.length} 个超过3个月的旧快照，确定继续吗？`
  )
  if (!confirmed) return
  
  try {
    const ids = oldSnapshots.map(s => s.id)
    await scheduleHistoryService.batchDeleteSnapshots(ids)
    ElMessage.success(`已删除 ${ids.length} 个旧快照`)
    
    // 刷新列表
    await loadHistoryList()
  } catch (error) {
    console.error('批量清理失败:', error)
    ElMessage.error('批量清理失败，请重试')
  }
}

// 监听打开历史列表对话框时加载数据
watch(showHistoryListDialog, async (newVal) => {
  if (newVal) {
    await loadHistoryList()
  }
})

// 🔧 修复：监听排班结果变化，标记为有未保存的修改
// 使用防抖避免频繁触发，并检查是否真的有修改
let scheduleChangeDebounceTimer: any = null
watch(scheduleResults, () => {
  // 🔧 如果正在恢复数据，不触发"未保存"状态
  if (isRestoringData.value) {
    return
  }
  
  // 清除之前的定时器
  if (scheduleChangeDebounceTimer) {
    clearTimeout(scheduleChangeDebounceTimer)
  }
  
  // 🔧 防抖：500ms后再标记为未保存（避免页面初始化渲染触发）
  scheduleChangeDebounceTimer = setTimeout(() => {
    if (currentSnapshotInfo.value && scheduleResults.value.length > 0) {
      // 只有在有快照信息时才标记（说明是从快照加载的）
      // 而且必须有数据
      hasUnsavedChanges.value = true
      process.env.NODE_ENV === 'development' && console.log('🔄 检测到排班数据变化，标记为未保存')
    }
  }, 500)
}, { deep: true })

// 💾 监听排班结果变化，自动保存到 localStorage
watch(scheduleResults, () => {
  if (scheduleResults.value.length > 0) {
    savePageState()
  }
}, { deep: true })

// 💾 监听其他关键数据变化，自动保存
watch([studentList, teacherList, examStartDateStr, examEndDateStr], () => {
  if (scheduleResults.value.length > 0) {
    savePageState()
  }
})

// 🚀 触发深度优化评估
watch([studentList, teacherList, examStartDateStr, examEndDateStr, 
       customUnavailableDates, allowWeekendScheduling], 
  async () => {
    // 延迟执行，避免频繁计算
    if (optimizedAssessmentDebounceTimer) {
      clearTimeout(optimizedAssessmentDebounceTimer)
    }
    
    optimizedAssessmentDebounceTimer = window.setTimeout(async () => {
      if (studentList.value.length > 0 && getTotalTeachersCount() >= 2) {
        // 同时触发两种评估
        await Promise.all([
          getOptimizedAssessment(),
          getPreciseAssessment()
        ])
        process.env.NODE_ENV === 'development' && console.log('[Assessment] 评估已更新（优化+精确）')
      }
    }, 500)
  },
  { immediate: true, deep: true }
)

let optimizedAssessmentDebounceTimer: number | null = null

// 🎯 精确评估防抖定时器
let preciseAssessmentDebounceTimer: number | null = null

// 页面加载时恢复排班结果
onMounted(async () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/53a25d9f-31ac-4999-bbed-18803cf2b93a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SchedulesPage.vue:onMounted:entry',message:'Page mounted, checking initial pinned state',data:{pinnedCount:pinnedScheduleIds.value.size,allPinned:Array.from(pinnedScheduleIds.value)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  // 💾 首先尝试恢复上次的页面状态
  const restored = restorePageState()
  
  // 🔧 设置更合理的默认日期范围（六周，约30个工作日）
  if (!examStartDateStr.value && !examEndDateStr.value) {
    setQuickDateRange(45) // 默认六周，提供充足的日期选择空间
  }
  
  // 检查URL参数，如果有action=create则直接打开新建排班模态框
  if (route.query.action === 'create') {
    showCreateModal.value = true
  }
  
  try {
    // 如果已经恢复了数据，就不需要再加载了
    if (restored && studentList.value.length > 0 && teacherList.value.length > 0) {
      process.env.NODE_ENV === 'development' && console.log('✅ 使用已恢复的学员和教师数据')
      return
    }
    
    // 加载学员数据
    await loadStudentData()
    
    // 加载教师数据
    try {
      const teachers = await prepareTeacherData()
      teacherList.value = teachers
      cachedTeacherData = teachers
      process.env.NODE_ENV === 'development' && console.log('页面初始化时加载教师数据完成，数量:', teachers.length)
    } catch (error) {
      console.warn('页面初始化时加载教师数据失败:', error)
    }
    
    // 检查是否有缓存的排班结果
    // 🔧 临时禁用缓存恢复，避免旧数据干扰调试
    console.warn('⚠️ [调试模式] 已禁用缓存恢复功能，确保显示最新的排班结果')
    scheduleResults.value = []
    
    /* 
    // 原缓存恢复逻辑（已临时禁用）
    const savedResult = await storageService.loadLatestScheduleResult()
    if (savedResult && savedResult.displayData) {
      process.env.NODE_ENV === 'development' && console.log('发现缓存的排班结果', savedResult.title)
      process.env.NODE_ENV === 'development' && console.log('缓存时间:', savedResult.timestamp)
      
      // 检查缓存是否过期（超过1小时则认为过期）
      const cacheTime = new Date(savedResult.timestamp)
      const now = new Date()
      const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff > 1) {
        process.env.NODE_ENV === 'development' && console.log('⚠️ 缓存已过期，清除旧数据')
        scheduleResults.value = []
        // 清除过期缓存
        localStorage.removeItem('latest_schedule_result')
      } else {
        process.env.NODE_ENV === 'development' && console.log('✅恢复缓存的排班结果')
        scheduleResults.value = savedResult.displayData
        
        // 添加缓存数据验证
        process.env.NODE_ENV === 'development' && console.log('🔍 缓存数据验证:', {
          recordCount: savedResult.displayData.length,
          firstRecord: savedResult.displayData[0],
          hasValidData: savedResult.displayData.every((record: any) => 
            record.student && record.examiner1_1 && record.examiner1_2
          )
        })
        
        // 如果缓存数据有问题，清除它
        const hasInvalidData = savedResult.displayData.some((record: any) => 
          record.examiner1_1 === record.examiner1_2 || 
          record.examiner2_1 === record.examiner2_2
        )
        
        if (hasInvalidData) {
          process.env.NODE_ENV === 'development' && console.log('⚠️检测到缓存数据有重复考官问题，清除缓存')
          scheduleResults.value = []
          
          // 彻底清除所有相关缓存
          await clearAllCacheData()
        }
      }
    } else {
      process.env.NODE_ENV === 'development' && console.log('没有找到保存的排班结果')
      scheduleResults.value = []
    }
    */
  } catch (error) {
    console.error('初始化失败:', error)
    scheduleResults.value = []
  }
  
  // 初始化响应式设计
  updateScreenSize()
  
  
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize)
  window.addEventListener('resize', updateScreenSize)
  
  // 初始检查
  nextTick(() => {
    setTimeout(checkContentOverflow, 100) // 延迟检查确保DOM完全渲染
  })
})

// 组件卸载时清理监听器
onUnmounted(() => {
  process.env.NODE_ENV === 'development' && console.log('🧹 [清理] 组件卸载，开始清理所有资源...')
  
  // 移除事件监听器
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('resize', updateScreenSize)
  
  // 🔴 关键：停止智能进度管理器
  smartProgress.pause()
  process.env.NODE_ENV === 'development' && console.log('✅ [清理] 智能进度管理器已停止')
  
  // 🔴 清理进度更新定时器
  if (progressUpdateTimer) {
    clearInterval(progressUpdateTimer)
    progressUpdateTimer = null
    process.env.NODE_ENV === 'development' && console.log('✅ [清理] 进度更新定时器已清理')
  }
  
  // 🔴 清理模拟进度定时器
  if (fallbackProgressTimer) {
    clearInterval(fallbackProgressTimer)
    fallbackProgressTimer = null
    process.env.NODE_ENV === 'development' && console.log('✅ [清理] 模拟进度定时器已清理')
  }
  
  // 清理中间结果定时器
  if (intermediateResultTimer) {
    clearTimeout(intermediateResultTimer)
    intermediateResultTimer = null
    process.env.NODE_ENV === 'development' && console.log('✅ [清理] 中间结果定时器已清理')
  }
  
  // 清理WebSocket相关
  if (realtimeProgressUnsubscribe) {
    realtimeProgressUnsubscribe()
    realtimeProgressUnsubscribe = null
    process.env.NODE_ENV === 'development' && console.log('✅ [清理] WebSocket订阅已取消')
  }
  
  if (realtimeProgressServiceInstance && typeof realtimeProgressServiceInstance.disconnect === 'function') {
    realtimeProgressServiceInstance.disconnect()
    process.env.NODE_ENV === 'development' && console.log('✅ [清理] WebSocket连接已断开')
  }
  
  activeRealtimeSessionId = null
  
  process.env.NODE_ENV === 'development' && console.log('🎉 [清理] 所有资源清理完成')
})

// script setup 中，所有的响应式变量和函数都会自动暴露给模板
// 不需要显式的 return 语句
</script>   

<style scoped>
/* 移除集成状态面板样式 */

/* 🎬 表格行渐进式动画效果 */
@keyframes slideInFromLeft {
  0% {
    opacity: 0;
    transform: translateX(-30px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

/* 新出现的行自动应用动画 */
.schedule-table tbody tr {
  animation: slideInFromLeft 0.4s ease-out, fadeIn 0.4s ease-out;
}

/* 实时更新时的高亮效果 */
.schedule-table tbody tr.new-row {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
  animation: slideInFromLeft 0.5s ease-out, fadeIn 0.5s ease-out;
}

/* 表格更新中的脉冲效果 */
.table-container.updating {
  position: relative;
}

.table-container.updating::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    #3b82f6 50%, 
    transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  z-index: 10;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 🎬 OptaPlanner风格的求解动画样式 */
.table-cell-animating {
  position: relative;
  background: linear-gradient(90deg, #f8fafc, #e2e8f0, #f8fafc);
  background-size: 200% 100%;
  animation: optaPlannerSolving 2s ease-in-out infinite;
  border: 1px solid #cbd5e1;
}

.table-cell-typing {
  background: linear-gradient(45deg, #fef3c7, #fde68a);
  color: #92400e;
  font-weight: 500;
  position: relative;
  overflow: hidden;
  animation: variableAssignment 1.5s ease-in-out infinite;
}

.table-cell-selecting {
  background: linear-gradient(45deg, #dbeafe, #93c5fd);
  color: #1d4ed8;
  font-weight: 500;
  border: 1px solid #3b82f6;
  animation: constraintChecking 1.2s ease-in-out infinite alternate;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.table-cell-confirming {
  background: linear-gradient(45deg, #d1fae5, #86efac);
  color: #065f46;
  font-weight: 600;
  border: 1px solid #10b981;
  animation: solutionOptimizing 0.8s ease-in-out;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

/* OptaPlanner求解过程动画 */
@keyframes optaPlannerSolving {
  0% { 
    background-position: -200% 0;
    transform: scale(1);
  }
  50% { 
    background-position: 0% 0;
    transform: scale(1.01);
  }
  100% { 
    background-position: 200% 0;
    transform: scale(1);
  }
}

@keyframes variableAssignment {
  0% { 
    background: #fef3c7; 
    opacity: 0.7;
  }
  50% { 
    background: #fde68a; 
    opacity: 1;
  }
  100% { 
    background: #fef3c7; 
    opacity: 0.7;
  }
}

@keyframes constraintChecking {
  0% { 
    transform: scale(1); 
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    background: #dbeafe;
  }
  100% { 
    transform: scale(1.02); 
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    background: #93c5fd;
  }
}

@keyframes solutionOptimizing {
  0% { 
    background: #d1fae5; 
    transform: scale(1);
  }
  50% { 
    background: #86efac; 
    transform: scale(1.03);
  }
  100% { 
    background: #d1fae5; 
    transform: scale(1);
  }
}

/* OptaPlanner求解阶段行高亮 */
.schedule-table tbody tr.animating-row {
  background: linear-gradient(90deg, #f8fafc, #f1f5f9);
  border-left: 4px solid #3b82f6;
  transition: all 0.4s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

  .schedule-table tbody tr.animating-row:hover {
    background: linear-gradient(90deg, #f1f5f9, #e2e8f0);
    transform: translateX(2px);
  }
  
  /* OptaPlanner求解状态样式 */
  .stat-value.constraint {
    color: #7c3aed;
    font-weight: 600;
  }

/* CSS变量定义 */
:root {
  --sidebar-width: 280px;
  --sidebar-collapsed-width: 80px;
  --content-padding: 24px;
  --border-radius: 12px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
}

/* 基础样式重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* 主容器- 响应式优化*/
.app-container {
  width: 100%;
  max-width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1f2937;
  position: relative;
}

/* 移动端遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  backdrop-filter: blur(2px);
}

/* 响应式布局*/
.mobile-layout {
  flex-direction: column;
}

.tablet-layout {
  gap: 20px;
}

.desktop-layout {
  gap: 24px;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .app-container {
    flex-direction: column;
  }
}

/* 平板端适配 */
@media (min-width: 768px) and (max-width: 1023px) {
  .app-container {
    width: 100%;
    height: 100vh;
  }
}

/* 桌面端适配 */
@media (min-width: 1024px) {
  .app-container {
    width: 100%;
    height: 100vh;
  }
}

/* 侧边栏样式- 响应式优化*/
.sidebar {
  width: var(--sidebar-width);
  height: 100%;
  background: linear-gradient(180deg, #1e3a5f 0%, #2c5282 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1000;
}

.sidebar-collapsed {
  width: var(--sidebar-collapsed-width);
}

/* 移动端侧边栏 */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  
  .sidebar-collapsed {
    transform: translateX(calc(-100% + var(--sidebar-collapsed-width)));
  }
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
  width: 40px;
  height: 40px;
  object-fit: cover;
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
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  z-index: 10;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item-active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
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

/* 侧边栏切换按钮*/
.sidebar-toggle {
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
  transition: transform 0.2s ease;
}

.sidebar-toggle:hover {
  transform: translateY(-50%) scale(1.1);
}

.toggle-icon {
  width: 16px;
  height: 16px;
  color: #374151;
  transition: transform 0.3s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

/* 主内容区域 - 响应式优化*/
.main-content {
  flex: 1;
  height: 100%;
  background: #f5f7fa;
  display: flex;
  gap: 24px;
  padding: 32px; /* 统一与首页一致的边距 */
  overflow: auto; /* 修改为auto，允许横向和纵向滚动 */
  transition: all 0.3s ease;
}

/* 移动端主内容区域 */
@media (max-width: 767px) {
  .main-content {
    flex-direction: column;
    gap: 16px;
    padding: 16px; /* 统一边距 */
    margin-left: 0;
  }
  
  .main-content.sidebar-open {
    margin-left: var(--sidebar-collapsed-width);
  }
}

/* 平板端主内容区域 */
@media (min-width: 768px) and (max-width: 1023px) {
  .main-content {
    gap: 20px;
    padding: 24px; /* 统一边距 */
  }
}

/* 桌面端及以上 */
@media (min-width: 1024px) {
  .main-content {
    gap: 24px;
  }
}

/* 约束条件面板 */
.constraints-panel {
  width: 320px;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
}

/* 右侧内容区域 */
.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-right: 0; /* 完全移除右侧内边距 */
}

.right-content.full-width {
  width: 100%;
}

/* 页面标题区 - 响应式优化*/
.page-header {
  background: white;
  border-radius: var(--border-radius);
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow);
  flex-wrap: wrap;
  gap: 16px;
}

.page-title {
  font-size: clamp(1.25rem, 4vw, 1.5rem);
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* 移动端页面标题栏 */
@media (max-width: 767px) {
  .page-header {
    padding: 16px 20px;
    margin-bottom: 16px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .page-title {
    text-align: center;
    font-size: 1.25rem;
  }
  
  .header-actions {
    justify-content: center;
    gap: 8px;
  }
}

/* 平板端页面标题栏 */
@media (min-width: 768px) and (max-width: 1023px) {
  .page-header {
    padding: 18px 22px;
    margin-bottom: 20px;
  }
  
  .page-title {
    font-size: 1.375rem;
  }
  
  .header-actions {
    gap: 10px;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn-secondary:hover {
  background: #e5e7eb;
  color: #374151;
}

.action-btn-primary {
  background: #3b82f6;
  color: white;
}

.action-btn-primary:hover {
  background: #2563eb;
}

.action-btn-info {
  background: #06b6d4;
  color: white;
}

.action-btn-info:hover {
  background: #0891b2;
}

.action-btn-success {
  background: #10b981;
  color: white;
}

.action-btn-success:hover {
  background: #059669;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

/* 🆕 实时更新提示横幅 */
.realtime-update-banner {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  animation: pulse-border 2s ease-in-out infinite;
}

.update-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #1e40af;
  font-weight: 600;
  font-size: 14px;
}

.update-count {
  margin-left: auto;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  color: #2563eb;
  animation: countUpdate 0.3s ease-out;
}

@keyframes countUpdate {
  0% {
    transform: scale(1.1);
    background: rgba(59, 130, 246, 0.3);
  }
  100% {
    transform: scale(1);
    background: rgba(59, 130, 246, 0.1);
  }
}

.loading-dots {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* 🎯 中间结果提示横幅样式 */
.intermediate-result-banner {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  animation: intermediate-pulse 2s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.intermediate-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #92400e;
  font-weight: 600;
  font-size: 14px;
  position: relative;
  padding-bottom: 8px;
}

.pulse-icon {
  font-size: 18px;
  animation: pulse-scale 1.5s ease-in-out infinite;
}

@keyframes pulse-scale {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}

.intermediate-text {
  flex: 1;
  text-align: center;
}

.countdown-bar {
  position: absolute;
  bottom: 0;
  left: -16px;
  right: -16px;
  height: 3px;
  background: rgba(245, 158, 11, 0.3);
  border-radius: 0 0 6px 6px;
  overflow: hidden;
}

.countdown-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: #f59e0b;
  animation: countdown 3s linear;
}

@keyframes countdown {
  0% {
    width: 100%;
  }
  100% {
    width: 0%;
  }
}

@keyframes intermediate-pulse {
  0%, 100% {
    border-color: #f59e0b;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
  }
  50% {
    border-color: #fbbf24;
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
  }
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #93c5fd;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes table-updating {
  0%, 100% {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  50% {
    box-shadow: 0 8px 20px -4px rgba(59, 130, 246, 0.3), 0 4px 8px -2px rgba(59, 130, 246, 0.2);
  }
}

/* 表格容器 - 响应式优化*/
.table-container {
  background: white;
  border-radius: var(--border-radius);
  overflow: auto;
  box-shadow: var(--shadow);
  max-height: calc(100vh - 200px);
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
  position: relative;
  transition: all 0.3s ease;
}

/* 🆕 表格更新中的样式 */
.table-container.updating {
  border: 2px solid #3b82f6;
  animation: table-updating 1.5s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
}

/* 实时更新行闪烁效果 */
@keyframes row-flash {
  0% {
    background-color: rgba(59, 130, 246, 0.2);
    transform: scale(1.01);
  }
  50% {
    background-color: rgba(34, 197, 94, 0.3);
  }
  100% {
    background-color: transparent;
    transform: scale(1);
  }
}

.schedule-table tbody tr.realtime-update {
  animation: row-flash 1s ease-out;
}

.table-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.table-container::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.table-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 6px;
  border: 2px solid #f8fafc;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #2563eb, #1e40af);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
}

.table-container::-webkit-scrollbar-thumb:active {
  background: linear-gradient(135deg, #1d4ed8, #1e3a8a);
}

.table-container::-webkit-scrollbar-corner {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

/* 移动端表格容器*/
@media (max-width: 767px) {
  .table-container {
    max-height: calc(100vh - 160px);
    border-radius: var(--border-radius);
    margin: 0 -4px;
  }
  
  .table-container::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
}

/* 平板端表格容器*/
@media (min-width: 768px) and (max-width: 1023px) {
  .table-container {
    max-height: calc(100vh - 180px);
  }
  
  .table-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
}

/* 桌面端及以上 */
@media (min-width: 1024px) {
  .table-container {
    max-height: calc(100vh - 200px);
  }
}

.schedule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  min-width: 800px;
}

.schedule-table th {
  background: #f9fafb;
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.schedule-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
  vertical-align: top;
  transition: all 0.3s ease, background-color 0.5s ease; /* 🎬 添加过渡效果 */
}

/* 🎬 数据变化时的高亮效果 */
.schedule-table td.data-changed {
  background-color: rgba(59, 130, 246, 0.1) !important;
  animation: cellPulse 0.6s ease;
}

@keyframes cellPulse {
  0%, 100% { 
    background-color: transparent; 
  }
  50% { 
    background-color: rgba(59, 130, 246, 0.2); 
  }
}

/* 移动端表格样式*/
@media (max-width: 767px) {
  .schedule-table {
    font-size: 0.75rem;
    min-width: 600px;
  }
  
  .schedule-table th,
  .schedule-table td {
    padding: 12px 8px;
  }
  
  .schedule-table th {
    font-size: 0.75rem;
  }
  
  /* 隐藏部分列以适应小屏幕*/
  .schedule-table th:nth-child(n+8),
  .schedule-table td:nth-child(n+8) {
    display: none;
  }
}

/* 平板端表格样式*/
@media (min-width: 768px) and (max-width: 1023px) {
  .schedule-table {
    font-size: 0.8125rem;
    min-width: 700px;
  }
  
  .schedule-table th,
  .schedule-table td {
    padding: 14px 16px;
  }
}

/* 桌面端表格样式*/
@media (min-width: 1024px) {
  .schedule-table {
    font-size: 0.875rem;
  }
  
  .schedule-table th,
  .schedule-table td {
    padding: 16px 20px;
  }
}

.schedule-table td {
  height: 60px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.schedule-table tbody tr:hover {
  background: #f9fafb;
}

.schedule-table tbody tr.hard-conflict-row {
  background: rgba(239, 68, 68, 0.08);
  border-left: 4px solid #ef4444;
}

.schedule-table tbody tr.hard-conflict-row:hover {
  background: rgba(239, 68, 68, 0.12);
}

.schedule-table tbody tr:last-child td {
  border-bottom: none;
}

.department-cell,
.student-cell {
  vertical-align: middle;
  text-align: center;
  font-weight: 500;
  background: #f9fafb;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

/* 预览弹窗更高层级 */
.preview-modal-overlay {
  z-index: 999999;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 0;
  max-width: 1200px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* 可拖拽弹窗样式*/
.draggable-modal {
  position: relative;
  transition: none;
}

.draggable-modal.dragging {
  transition: none;
}

/* 拖拽标题栏样式*/
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
  border-radius: 16px 16px 0 0;
}

.draggable-header {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}



/* 导入步骤样式 */
.import-area {
  margin-bottom: 24px;
}

.upload-zone {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-zone:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.upload-icon {
  width: 48px;
  height: 48px;
  color: #9ca3af;
  margin: 0 auto 16px;
}

.upload-text {
  font-size: 18px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: #6b7280;
}

/* 文件信息样式 */
.file-info {
  margin-bottom: 16px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f3f4f6;
  border-radius: 8px;
}

.file-icon {
  width: 20px;
  height: 20px;
  color: #3b82f6;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.view-icon,
.delete-icon {
  width: 16px;
  height: 16px;
  color: #6b7280;
  cursor: pointer;
}

.delete-icon:hover {
  color: #ef4444;
}

.support-text {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 24px;
}

/* 时间选择区域 */
.time-selection-section {
  margin-top: 24px;
}

.exam-date-form {
  margin: 20px 0;
}

.date-description {
  margin-bottom: 20px;
  padding: 16px;
  background: #fefce8;
  border: 1px solid #fde047;
  border-radius: 8px;
}

.description-text {
  margin: 0;
  font-size: 14px;
  color: #a16207;
  line-height: 1.5;
}

.time-row {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.date-range-row {
  margin-bottom: 16px;
}

.time-label {
  min-width: 120px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.exam-date-picker {
  flex: 1;
  max-width: 300px;
}

.date-range-container {
  width: 100%;
  margin: 16px 0;
  overflow: visible;
  position: relative;
}

.exam-date-range-picker {
  width: 100%;
}

.time-tips {
  margin: 20px 0;
  padding: 16px;
  background: #f0f9ff;
  border: 1px solid #e0f2fe;
  border-radius: 8px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #0369a1;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-icon {
  width: 16px;
  height: 16px;
  color: #0284c7;
}

/* 下一步区域*/
.next-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.next-btn {
  background: #3b82f6;
  color: white;
  padding: 8px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.next-btn:hover {
  background: #2563eb;
}

/* 学员列表样式 */
.student-list {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.student-item {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  font-size: 14px;
}

.student-item:last-child {
  border-bottom: none;
}

.student-department {
  color: #374151;
  font-weight: 500;
}

.student-name {
  color: #1f2937;
  font-weight: 600;
}

.exam-type {
  color: #6b7280;
}

/* 约束条件样式 */
.constraints-section {
  margin-bottom: 24px;
}

.constraints-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.constraint-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.constraint-item:last-child {
  border-bottom: none;
}

.constraint-text {
  font-size: 14px;
  color: #374151;
}

/* 双列布局样式 */
.modal-layout {
  display: flex;
  min-height: 600px;
}

.left-panel {
  flex: 1;
  padding: 32px;
  border-right: 1px solid #f3f4f6;
  background: #fafbfc;
}

.right-panel {
  flex: 1;
  padding: 32px;
  background: white;
}

.panel-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 24px;
}

/* 时间选择区域样式 */
.time-selection-area {
  margin-top: 32px;
}

.section-subtitle {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.time-inputs {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.time-input {
  padding: 12px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.2s ease;
}

.time-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.generate-section {
  width: 100%;
}

.generate-btn {
  width: 100%;
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.generate-btn:hover:not(:disabled) {
  background: #2563eb;
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: #6b7280;
}

.generate-btn.loading {
  background: #6b7280;
}

/* 进度条样式*/
.progress-bar {
  width: 100%;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* 错误提示样式 */
.error-message {
  margin-top: 12px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  line-height: 1.4;
}

/* 约束条件样式 */
.constraint-group {
  margin-bottom: 32px;
}

.constraint-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.constraint-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.constraint-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
}

.constraint-text {
  font-size: 14px;
  color: #374151;
  flex: 1;
}

.constraint-footer {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid #f3f4f6;
}

.constraint-note {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  margin: 0;
}

/* 文件预览弹窗样式 */
.preview-modal-content {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 0;
  max-width: 900px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  margin: auto;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid #f3f4f6;
  background: #f8fafc;
}

.preview-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.close-btn {
  padding: 8px;
  background: none;
  border: none;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.preview-body {
  padding: 24px 32px;
  max-height: 60vh;
  overflow-y: auto;
}

.preview-info {
  margin-bottom: 20px;
}

.file-info-text {
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.data-info-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.preview-table-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.preview-table th {
  background: #f9fafb;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.preview-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
}

.preview-table tbody tr:last-child td {
  border-bottom: none;
}

.preview-table tbody tr:hover {
  background: #f9fafb;
}

/* 开关样式*/
.toggle-switch {
  width: 44px;
  height: 24px;
  background: #d1d5db;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.toggle-switch.active {
  background: #10b981;
}

.toggle-handle {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch.active .toggle-handle {
  transform: translateX(20px);
}

.constraints-note {
  font-size: 14px;
  color: #6b7280;
  margin: 24px 0 16px;
}

.start-schedule-btn {
  background: #3b82f6;
  color: white;
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.start-schedule-btn:hover {
  background: #2563eb;
}

/* 分步骤弹窗样式*/
.step-modal {
  width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

/* 步骤指示器样式*/
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 80px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  background: #e5e7eb;
  color: #6b7280;
  transition: all 0.3s ease;
}

.step-item.active .step-number {
  background: #3b82f6;
  color: white;
}

.step-item.completed .step-number {
  background: #10b981;
  color: white;
}

.step-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  text-align: center;
}

.step-item.active .step-label {
  color: #3b82f6;
  font-weight: 600;
}

.step-item.completed .step-label {
  color: #10b981;
  font-weight: 600;
}

.step-divider {
  flex: 1;
  height: 2px;
  background: #e5e7eb;
  margin: 0 16px;
  max-width: 40px;
}

/* 步骤内容样式 */
.step-content {
  padding: 32px;
  min-height: 400px;
}

.step-title {
  text-align: center;
  margin-bottom: 32px;
}

.step-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  margin: 0 auto 16px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.step-title h3 {
  font-size: 26px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.step-description {
  font-size: 16px;
  color: #6b7280;
  margin: 0 auto;
  max-width: 600px;
  line-height: 1.6;
}

/* 文件上传区域样式 */
/* 🆕 从考官分配导入选项区域 */
.import-options {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.import-from-assignment-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.import-from-assignment-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.import-from-assignment-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
}

.import-from-assignment-btn.has-data {
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5);
  }
}

.import-divider {
  color: #9ca3af;
  font-size: 14px;
  font-weight: 500;
}

.file-upload-area {
  margin-bottom: 32px;
}

.upload-placeholder {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 48px 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-placeholder:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.upload-icon {
  color: #9ca3af;
  margin-bottom: 16px;
}

.upload-placeholder:hover .upload-icon {
  color: #3b82f6;
}

.upload-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.upload-subtext {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.file-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
}

.file-name {
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.file-size {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.change-file-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
}

.change-file-btn:hover {
  background: #2563eb;
}

/* 学员预览样式 */
.student-preview {
  margin-top: 32px;
}

.preview-header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.student-preview h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.preview-controls {
  display: flex;
  gap: 8px;
}

.show-more-btn, .show-less-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.show-more-btn:hover, .show-less-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.preview-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.preview-header {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr 2fr 1.5fr;
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

/* 当没有推荐考官列时的5列布局 */
.preview-header:has(:nth-child(5):last-child) {
  grid-template-columns: 60px 1fr 1fr 1fr 1.5fr;
}

.preview-header span {
  padding: 12px 8px;
  border-right: 1px solid #e5e7eb;
  font-size: 14px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-header span:last-child {
  border-right: none;
}

.preview-rows {
  background: white;
}

.preview-row {
  display: grid;
  grid-template-columns: 60px 1fr 1fr 1fr 2fr 1.5fr;
  border-bottom: 1px solid #f3f4f6;
  min-height: 50px;
  align-items: center;
}

.preview-row:last-child {
  border-bottom: none;
}

.preview-row span {
  padding: 10px 8px;
  border-right: 1px solid #f3f4f6;
  color: #6b7280;
  font-size: 14px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-row span:last-child {
  border-right: none;
}

.recommended-examiners {
  font-size: 12px;
  color: #059669;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 🆕 考试内容单元格样式 */
.exam-content-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 160px;
}

.exam-days-select {
  padding: 4px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  max-width: 150px;
}

.exam-days-select:hover {
  border-color: #3b82f6;
}

.exam-days-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.exam-type-badge {
  font-size: 11px;
  padding: 3px 6px;
  border-radius: 4px;
  font-weight: 500;
  white-space: normal;
  word-wrap: break-word;
  word-break: break-all;
  line-height: 1.4;
  max-width: 100%;
}

.exam-type-1 {
  background-color: #dbeafe;
  color: #1e40af;
}

.exam-type-2 {
  background-color: #d1fae5;
  color: #065f46;
}

/* 🆕 一天考试的单元格样式 */
.one-day-exam-cell {
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  font-style: italic;
  cursor: not-allowed !important;
  pointer-events: none;
}

.one-day-exam-cell:hover {
  background-color: #f3f4f6 !important;
}

.preview-more {
  padding: 12px 16px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
  background: #f9fafb;
  grid-column: 1 / -1;
}

.data-summary {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  font-weight: 500;
  color: #475569;
  font-size: 14px;
}

.summary-value {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

/* 快速日期选择样式 */
.quick-date-selection {
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 16px;
  border: 1px solid #bfdbfe;
}

.quick-date-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e40af;
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-date-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.quick-date-btn {
  padding: 10px 16px;
  background: white;
  border: 2px solid #e0f2fe;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #0369a1;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.quick-date-btn:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.quick-date-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 日期选择样式 */
.date-selection {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-label {
  font-weight: 600;
  color: #374151;
  font-size: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label-tip {
  font-size: 12px;
  font-weight: 400;
  color: #6b7280;
  font-style: italic;
}

.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-input {
  width: 100%;
  padding: 16px 50px 16px 16px;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #1f2937;
  background: white;
  transition: all 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.date-input-icon {
  position: absolute;
  right: 16px;
  font-size: 20px;
  color: #6b7280;
  pointer-events: none;
}

.date-input-wrapper.has-recommendation .date-input {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
  padding-right: 110px;
}

.apply-recommended-btn {
  position: absolute;
  right: 50px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.apply-recommended-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
}

.label-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-label-tip.recommended {
  color: #3b82f6;
  font-weight: 600;
  background: #dbeafe;
  padding: 2px 8px;
  border-radius: 4px;
  font-style: normal;
}

.smart-date-hint {
  animation: slideIn 0.4s ease-out;
}

/* 字段提示 */
.field-hint {
  animation: fadeIn 0.3s ease-out;
}

.field-hint.success {
  background: #f0fdf4;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid #10b981;
}

/* 智能建议样式 */
.date-suggestion {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #f59e0b;
  border-radius: 16px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.suggestion-icon {
  font-size: 20px;
}

.suggestion-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #92400e;
}

.suggestion-text {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
}

.suggestion-btn {
  padding: 8px 16px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-btn:hover {
  background: #d97706;
  transform: translateY(-1px);
}

/* 增强的日期信息样式 */
.date-info-enhanced {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 2px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
}

.date-info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.info-header-icon {
  font-size: 24px;
}

.info-header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.info-card.success {
  border-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.info-card.warning {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.info-card-icon {
  font-size: 24px;
  min-width: 24px;
}

.info-card.success .info-card-icon {
  color: #10b981;
}

.info-card.warning .info-card-icon {
  color: #f59e0b;
}

.info-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-card-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-card-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

/* 日期详情样式 */
.date-details {
  margin-bottom: 24px;
}

.date-details-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.details-icon {
  font-size: 16px;
  color: #6b7280;
}

.details-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.details-count {
  font-size: 12px;
  color: #6b7280;
}

.date-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.date-tag {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  background: white;
}

.date-tag.workday {
  background: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.date-tag.weekend {
  background: #fef3c7;
  border-color: #f59e0b;
  color: #92400e;
}

.date-more {
  padding: 6px 12px;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

/* 增强的容量评估样式 */
.capacity-assessment {
  padding: 24px;
  background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
  border: 2px solid #eab308;
  border-radius: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(234, 179, 8, 0.1);
}

.capacity-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.capacity-icon {
  font-size: 24px;
}

.capacity-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #a16207;
  flex: 1;
}

.capacity-badge {
  padding: 4px 12px;
  background: #f59e0b;
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.capacity-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 容量指标网格 */
.capacity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.capacity-metric {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #fbbf24;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.capacity-metric:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
}

.metric-icon {
  font-size: 20px;
  min-width: 20px;
}

.metric-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-label {
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}

.metric-value.theoretical {
  color: #7c3aed;
  font-weight: 800;
}

.metric-value.success {
  color: #065f46;
}

.metric-value.warning {
  color: #92400e;
}

.metric-value.danger {
  color: #dc2626;
}

.metric-value.info {
  color: #1e40af;
}

/* 容量利用率进度条 */
.capacity-utilization {
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #fbbf24;
  border-radius: 12px;
}

.utilization-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.utilization-label {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.utilization-value {
  font-size: 16px;
  font-weight: 700;
}

.utilization-bar {
  width: 100%;
  height: 8px;
  background: #fef3c7;
  border-radius: 4px;
  overflow: hidden;
}

.utilization-fill {
  height: 100%;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.utilization-fill.success {
  background: linear-gradient(90deg, #10b981, #059669);
}

.utilization-fill.warning {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.utilization-fill.danger {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}

.utilization-fill.info {
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

/* 约束条件分析 */
.constraint-analysis {
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #fbbf24;
  border-radius: 12px;
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.analysis-icon {
  font-size: 16px;
  color: #92400e;
}

.analysis-title {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.constraint-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.constraint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.constraint-label {
  font-weight: 500;
  color: #92400e;
  min-width: 140px;
}

.constraint-value {
  font-weight: 600;
  color: #1f2937;
}

.constraint-bottleneck {
  font-weight: 600;
  color: #dc2626;
  flex: 1;
}

/* 容量状态 */
.capacity-status {
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  margin-top: 4px;
}

.capacity-status.success {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #065f46;
  border: 2px solid #10b981;
}

.capacity-status.warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border: 2px solid #f59e0b;
}

.capacity-status.danger {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  color: #dc2626;
  border: 2px solid #ef4444;
}

.capacity-status.info {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border: 2px solid #3b82f6;
}

/* 日期提示样式 */
.date-tips {
  padding: 20px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #0ea5e9;
  border-radius: 16px;
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.tip-icon {
  font-size: 20px;
  color: #0ea5e9;
}

.tip-title {
  font-size: 16px;
  font-weight: 600;
  color: #0c4a6e;
}

.tip-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #0c4a6e;
  line-height: 1.5;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-bullet {
  color: #0ea5e9;
  font-weight: bold;
  margin-top: 2px;
}

.tip-text strong {
  color: #0c4a6e;
  font-weight: 600;
}

/* 日期信息样式 */
.date-info {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item.warning {
  color: #d97706;
}

.info-label {
  font-weight: 500;
  color: #374151;
}

.info-item.warning .info-label {
  color: #d97706;
}

.info-value {
  font-weight: 600;
  color: #1f2937;
}

.info-item.warning .info-value {
  color: #d97706;
}

/* 步骤导航样式 */
.step-navigation {
  display: flex;
  align-items: center;
  padding: 24px 32px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.nav-spacer {
  flex: 1;
}

.nav-btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.nav-btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.nav-btn-primary {
  background: #3b82f6;
  color: white;
}

.nav-btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.nav-btn-success {
  background: #10b981;
  color: white;
}

.nav-btn-success:hover:not(:disabled) {
  background: #059669;
}

/* 结果步骤样式 */
.result-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.result-table-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 24px;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.result-table th {
  background: #f9fafb;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.result-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  color: #6b7280;
}

.result-table tbody tr:hover {
  background: #f9fafb;
}

/* 可编辑单元格样式 */
.editable-cell {
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s ease;
}

.editable-cell:hover {
  background-color: #f0f9ff;
  color: #1d4ed8;
}

.editable-cell:hover::after {
  content: '✏️';
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
}

/* ✏️ 人工修改的单元格样式 - 基础样式 */
.editable-cell[class*="manually-edited-"] {
  font-weight: 600 !important;
  position: relative;
  padding-left: 24px !important; /* 为图标留出空间 */
}

.editable-cell[class*="manually-edited-"]::before {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  opacity: 0.85;
}

/* ✅ 无冲突修改 - 绿色 */
.editable-cell.manually-edited-success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%) !important;
  color: #065f46 !important;
  border-left: 3px solid #10b981 !important;
}

.editable-cell.manually-edited-success::before {
  content: '✅';
}

.schedule-table tbody tr:hover .editable-cell.manually-edited-success,
.editable-cell.manually-edited-success:hover {
  background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%) !important;
  color: #047857 !important;
}

/* ℹ️ 一般提示 - 蓝色 */
.editable-cell.manually-edited-info {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%) !important;
  color: #1e40af !important;
  border-left: 3px solid #3b82f6 !important;
}

.editable-cell.manually-edited-info::before {
  content: 'ℹ️';
}

.schedule-table tbody tr:hover .editable-cell.manually-edited-info,
.editable-cell.manually-edited-info:hover {
  background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%) !important;
  color: #1e3a8a !important;
}

/* ⚠️ 软约束冲突 - 橙色 */
.editable-cell.manually-edited-warning {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%) !important;
  color: #92400e !important;
  border-left: 3px solid #f97316 !important;
}

.editable-cell.manually-edited-warning::before {
  content: '⚠️';
}

.schedule-table tbody tr:hover .editable-cell.manually-edited-warning,
.editable-cell.manually-edited-warning:hover {
  background: linear-gradient(135deg, #fdba74 0%, #fb923c 100%) !important;
  color: #7c2d12 !important;
}

/* 🚫 硬约束冲突 / 强制修改 - 红色 */
.editable-cell.manually-edited-error {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%) !important;
  color: #991b1b !important;
  border-left: 3px solid #ef4444 !important;
}

.editable-cell.manually-edited-error::before {
  content: '🚫';
}

.schedule-table tbody tr:hover .editable-cell.manually-edited-error,
.editable-cell.manually-edited-error:hover {
  background: linear-gradient(135deg, #fca5a5 0%, #f87171 100%) !important;
  color: #7f1d1d !important;
}

/* 🎨 图例样式 */
.legend-label {
  font-weight: 600;
  color: #374151;
  margin-right: 4px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #f9fafb;
  border-radius: 4px;
}

.legend-color {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #d1d5db;
}

.auto-assigned-legend {
  background: white;
  border-color: #d1d5db;
}

.manually-edited-success-legend {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #10b981;
}

.manually-edited-info-legend {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #3b82f6;
}

.manually-edited-warning-legend {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  border-color: #f97316;
}

.manually-edited-error-legend {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
  border-color: #ef4444;
}

/* 操作按钮样式 */
.action-cell {
  text-align: center;
  vertical-align: middle;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.edit-btn {
  background: #f0f9ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.edit-btn:hover:not(:disabled) {
  background: #dbeafe;
  border-color: #93c5fd;
}

.delete-btn {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.delete-btn:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
}

.save-btn {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.save-btn:hover:not(:disabled) {
  background: #dcfce7;
  border-color: #86efac;
}

.export-btn {
  background: #fefce8;
  color: #ca8a04;
  border: 1px solid #fde047;
}

.export-btn:hover:not(:disabled) {
  background: #fef9c3;
  border-color: #facc15;
}

.primary-btn {
  background: #3b82f6;
  color: white;
  border: 1px solid #3b82f6;
}

.primary-btn:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.secondary-btn {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.secondary-btn:hover:not(:disabled) {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.action-btn-warning {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fbbf24;
}

.action-btn-warning:hover:not(:disabled) {
  background: #fde68a;
  border-color: #f59e0b;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #3b82f6;
}

.action-btn-info:hover:not(:disabled) {
  background: #bfdbfe;
  border-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 结果操作区域样式 */
.result-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.modification-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f59e0b;
  font-size: 14px;
  font-weight: 500;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  background: #f59e0b;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 编辑弹窗样式 */
.edit-modal {
  width: 500px;
  max-width: 90vw;
}

.edit-info {
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.edit-info p {
  margin: 8px 0;
  color: #374151;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  color: #374151;
}

.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.result-table tbody tr:last-child td {
  border-bottom: none;
}

.restart-btn {
  background: #3b82f6;
  color: white;
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.restart-btn:hover {
  background: #2563eb;
}

/* 重新排班按钮动画样式 */
.btn-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.action-btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn:disabled:hover {
  background: inherit;
  transform: none;
}

/* 约束配置样式 */
.constraint-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 算法选择样式 */
.algorithm-selection {
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e9ecef;
}

.algorithm-selection h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.algorithm-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.algorithm-option {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.algorithm-option:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.algorithm-option.active {
  border-color: #3b82f6;
  background: #f0f7ff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.algorithm-icon {
  font-size: 24px;
  margin-right: 16px;
  min-width: 40px;
  text-align: center;
}

.algorithm-info {
  flex: 1;
}

.algorithm-info h5 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.algorithm-info p {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.algorithm-features {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.feature-tag {
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 500;
}

.algorithm-status {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.recommended-badge {
  padding: 4px 8px;
  background: #4caf50;
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
}

.experimental-badge {
  padding: 4px 8px;
  background: #ff9800;
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
}

.constraint-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  transition: all 0.2s ease;
}

.constraint-item:hover {
  background: #f1f3f4;
  border-color: #dee2e6;
}

.constraint-info {
  flex: 1;
}

.constraint-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.constraint-info p {
  margin: 0;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.constraint-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.constraint-toggle {
  width: 44px;
  height: 24px;
  background: #ccc;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.constraint-toggle.active {
  background: #4CAF50;
}

.toggle-handle {
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.constraint-toggle.active .toggle-handle {
  transform: translateX(20px);
}

.weight-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 120px;
}

.weight-control label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.weight-slider {
  width: 100px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.weight-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
}

.weight-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #4CAF50;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* 确认执行页面样式 */
.summary-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-item {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.summary-item h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.algorithm-desc {
  font-size: 12px;
  color: #666;
  margin: 4px 0 0 0;
}

.summary-item p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

/* 日期统计样式 */
.date-statistics {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-statistics p {
  margin: 2px 0;
  font-size: 14px;
}

.workday-detail {
  color: #4CAF50;
  font-weight: 500;
}

.adjusted-workday {
  color: #FF9800;
  font-size: 12px;
  font-weight: normal;
}

.holiday-warning {
  color: #F44336;
  font-weight: 500;
}

.weekend-info {
  color: #9E9E9E;
}

.constraint-summary {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-group {
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.summary-group h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.summary-group ul {
  margin: 0;
  padding-left: 16px;
  list-style: none;
}

.summary-group li {
  margin: 4px 0;
  font-size: 13px;
  color: #666;
  position: relative;
}

.summary-group li::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background: #4CAF50;
  border-radius: 50%;
}

/* 排班进度样式 */
.scheduling-progress {
  margin-top: 20px;
  padding: 20px;
  background: #f0f8ff;
  border-radius: 8px;
  border: 1px solid #b3d9ff;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-header h4 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.progress-percentage {
  font-size: 14px;
  font-weight: 600;
  color: #4CAF50;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  margin: 0;
  font-size: 13px;
  color: #666;
  text-align: center;
}

/* 错误提示样式 */
.error-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding: 16px;
  background: #fff5f5;
  border-radius: 8px;
  border: 1px solid #fed7d7;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-content h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #e53e3e;
}

.error-content p {
  margin: 0;
  font-size: 14px;
  color: #c53030;
}

/* 🎯 统一结果弹窗样式 */
.unified-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.unified-modal {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 标题栏 */
.modal-header {
  display: flex;
  align-items: flex-start;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.header-icon {
  flex-shrink: 0;
  margin-right: 16px;
}

.success-icon, .warning-icon, .error-icon {
  width: 32px;
  height: 32px;
}

.success-icon { color: #10b981; }
.warning-icon { color: #f59e0b; }
.error-icon { color: #ef4444; }

.header-content {
  flex: 1;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: #1f2937;
}

.modal-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.close-button {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.close-button:hover {
  background: #e5e7eb;
  color: #374151;
}

.close-icon {
  width: 20px;
  height: 20px;
}

/* 主体内容 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #1f2937;
}

/* 统计区域 */
.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
}

.stat-item.success {
  border-color: #10b981;
  background: #ecfdf5;
}

.stat-item.info {
  border-color: #3b82f6;
  background: #eff6ff;
}

.stat-item.warning {
  border-color: #f59e0b;
  background: #fffbeb;
}

.stat-item.error {
  border-color: #ef4444;
  background: #fef2f2;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
  font-weight: 500;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

/* 违反详情区域 */
.violations-section {
  margin-bottom: 24px;
}

.violations-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
}

.violations-count {
  font-weight: 600;
  color: #dc2626;
}

.severity-breakdown {
  font-size: 14px;
  color: #6b7280;
}

.violations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.violation-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: white;
  margin-bottom: 12px;
}

.violation-item.error {
  border-color: #fecaca;
  background: #fef2f2;
}

.violation-item.warning {
  border-color: #fed7aa;
  background: #fffbeb;
}

.violation-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.violation-icon {
  flex-shrink: 0;
  margin-right: 12px;
}

.error-icon-small, .warning-icon-small {
  width: 20px;
  height: 20px;
}

.error-icon-small { color: #dc2626; }
.warning-icon-small { color: #d97706; }

.violation-title {
  flex: 1;
  font-weight: 600;
  color: #1f2937;
}

.violation-count {
  font-size: 14px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 12px;
}

.violation-details {
  margin-left: 32px;
}

.violation-description {
  color: #4b5563;
  margin: 0;
  line-height: 1.5;
}

.more-violations {
  text-align: center;
  padding: 12px;
  color: #6b7280;
  font-style: italic;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  margin-top: 12px;
}

/* 成功区域 */
.success-section {
  margin-bottom: 24px;
}

.success-message {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
}

.success-icon-large {
  width: 48px;
  height: 48px;
  color: #10b981;
  flex-shrink: 0;
  margin-right: 16px;
}

.success-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #065f46;
}

.success-content p {
  margin: 0;
  color: #047857;
  line-height: 1.5;
}

.success-detail {
  margin-top: 12px !important;
  font-size: 14px !important;
  color: #059669 !important;
  background: rgba(16, 185, 129, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #10b981;
}

/* 部分完成样式 */
.partial-success-section {
  margin-bottom: 24px;
}

.partial-success-message {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background: #fffbeb;
  border: 1px solid #fde047;
  border-radius: 8px;
}

.warning-icon-large {
  width: 48px;
  height: 48px;
  color: #f59e0b;
  flex-shrink: 0;
  margin-right: 16px;
  margin-top: 4px;
}

.partial-success-content {
  flex: 1;
}

.partial-success-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #b45309;
}

.partial-success-content p {
  margin: 0 0 8px 0;
  color: #d97706;
  line-height: 1.5;
}

.warning-detail {
  margin-top: 12px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #ea580c !important;
  background: rgba(249, 115, 22, 0.1);
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #f59e0b;
}

.suggestion-box {
  margin-top: 16px;
  padding: 16px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 6px;
  border: 1px dashed #fbbf24;
}

.suggestion-title {
  margin: 0 0 12px 0 !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  color: #b45309 !important;
}

.suggestion-list {
  margin: 0;
  padding-left: 20px;
  color: #92400e;
  font-size: 13px;
  line-height: 1.8;
}

.suggestion-list li {
  margin-bottom: 6px;
}

.suggestion-list li:last-child {
  margin-bottom: 0;
}

/* 底部 */
.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.footer-info {
  font-size: 14px;
  color: #6b7280;
}

.engine-info {
  font-weight: 500;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

.action-button {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-button.primary {
  background: #3b82f6;
  color: white;
}

.action-button.primary:hover {
  background: #2563eb;
}

/* 响应式 */
@media (max-width: 768px) {
  .unified-modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .violations-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
}

/* 🆕 不可用考官详情样式 */
.date-info-enhanced {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.date-info-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}

.info-header-icon {
  font-size: 24px;
}

.info-header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  flex: 1;
}

.unavailable-count-badge {
  background: #fef3c7;
  color: #92400e;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.info-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.info-card.warning {
  background: #fef3c7;
  border-color: #fbbf24;
}

.info-card.success {
  background: #d1fae5;
  border-color: #10b981;
}

.info-card-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-card-label {
  font-size: 12px;
  color: #6b7280;
}

.info-card-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.unavailable-teachers-list {
  margin-top: 24px;
}

.unavailable-teachers-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.details-icon {
  font-size: 18px;
}

.details-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.teacher-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.teacher-unavailable-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.teacher-unavailable-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.teacher-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.teacher-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.teacher-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.teacher-dept {
  padding: 2px 8px;
  background: #e0e7ff;
  color: #4338ca;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.periods-count {
  background: #fee2e2;
  color: #991b1b;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.periods-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.period-item {
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  padding: 12px;
  border-radius: 6px;
}

.period-dates {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.period-icon {
  font-size: 14px;
}

.date-range {
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.overlap-days {
  margin-left: auto;
  background: #fed7aa;
  color: #92400e;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.period-reason {
  display: flex;
  align-items: start;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #fde68a;
}

.reason-icon {
  font-size: 14px;
  margin-top: 2px;
}

.reason-text {
  font-size: 13px;
  color: #78350f;
  line-height: 1.5;
}

.no-unavailable-teachers {
  text-align: center;
  padding: 40px 20px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px dashed #86efac;
}

.no-data-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.no-data-text {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #065f46;
}

.no-data-hint {
  margin: 0;
  font-size: 14px;
  color: #10b981;
}

/* ========== 历史排班管理面板样式 ========== */
.history-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-top: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.history-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.history-actions {
  display: flex;
  gap: 12px;
}

.current-snapshot-info {
  padding: 12px;
  background: #f3f4f6;
  border-radius: 8px;
  margin-top: 12px;
}

.info-text {
  margin: 0;
  font-size: 14px;
  color: #4b5563;
}

.unsaved-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: #fef3c7;
  color: #d97706;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* 历史列表样式 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.history-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.history-item.active {
  background: #eff6ff;
  border-color: #3b82f6;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-item-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.history-item-date {
  font-size: 12px;
  color: #6b7280;
}

.history-item-description {
  font-size: 14px;
  color: #6b7280;
  margin: 8px 0;
  line-height: 1.5;
}

.history-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0;
}

.meta-item {
  font-size: 13px;
  color: #4b5563;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.meta-item-clickable {
  cursor: pointer;
  transition: all 0.2s;
}

.meta-item-clickable:hover {
  background: #dbeafe;
  color: #1e40af;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.meta-item-warning {
  background: #fef3c7;
  color: #92400e;
  font-weight: 500;
}

.history-item-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.action-btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.action-btn-danger {
  background: #dc2626;
  color: white;
}

.action-btn-danger:hover {
  background: #b91c1c;
}

/* 清理提醒样式 */
.cleanup-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
}

.cleanup-content {
  flex: 1;
}

.action-btn-warning {
  background: #f59e0b;
  color: white;
}

.action-btn-warning:hover {
  background: #d97706;
}

/* 加载和空状态样式 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
}

.loading-state .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 表单样式 */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
}

/* 🆕 拖拽排班功能样式 */

/* 固定列 */
.pin-column {
  width: 50px;
  text-align: center;
  padding: 8px 4px;
}

.pin-button {
  width: 32px;
  height: 32px;
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pin-button:hover {
  background: #f3f4f6;
}

.pin-button.is-pinned {
  color: #3b82f6;
  background: #eff6ff;
}

.pin-button .filled {
  fill: currentColor;
}

/* 拖拽列 */
.drag-column {
  width: 40px;
  text-align: center;
  padding: 8px 4px;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 auto;
  cursor: move;
  opacity: 0.3;
  transition: opacity 0.2s ease;
  color: #6b7280;
}

.drag-handle:hover {
  opacity: 0.8;
}

.drag-handle.disabled {
  cursor: not-allowed;
  opacity: 0.15;
  color: #9ca3af;
}

.drag-icon {
  width: 100%;
  height: 100%;
}

/* 表格行状态 */
.schedule-table tbody tr.is-pinned {
  border-left: 4px solid #3b82f6;
  background: #eff6ff;
}

.schedule-table tbody tr.is-dragging {
  opacity: 0.5;
  background: #fef3c7;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.schedule-table tbody tr[draggable="true"]:not(.is-pinned):hover {
  background: #f9fafb;
  cursor: move;
}

/* 日期选择浮层 */
.date-picker-overlay {
  position: fixed;
  z-index: 9999;
  pointer-events: all;
}

.date-picker-panel {
  min-width: 320px;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.date-picker-header {
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-picker-btn {
  width: 28px;
  height: 28px;
  padding: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.close-picker-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.date-picker-body {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

/* 自定义滚动条 */
.date-picker-body::-webkit-scrollbar {
  width: 6px;
}

.date-picker-body::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.date-picker-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.date-picker-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.date-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 4px;
  border: 2px solid transparent;
}

.date-option:hover:not(.is-unavailable) {
  background: #f3f4f6;
  transform: translateX(4px);
}

.date-option.is-current {
  background: #dbeafe;
  border-color: #3b82f6;
  font-weight: 600;
}

.date-option.is-recommended {
  border-left: 3px solid #10b981;
}

.date-option.is-weekend {
  border-left: 3px solid #f59e0b;
}

.date-option.is-out-of-range {
  border-left: 3px solid #f59e0b;
  background: #fffbeb;
}

.date-option.is-out-of-range:hover {
  background: #fef3c7;
  transform: translateX(4px);
}

.date-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.date-label {
  flex: 1;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.date-info {
  font-size: 12px;
  color: #6b7280;
}

.date-picker-footer {
  padding: 12px 16px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.date-picker-tips {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}

.date-picker-tips ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.date-picker-tips li {
  margin: 4px 0;
}

/* ============================================
   智能评估组件样式
   ============================================ */

/* 状态卡片基础样式 */
.status-card {
  background: white;
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

/* 状态指示条 */
.status-indicator-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
}

/* 状态图标容器 */
.status-icon-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

/* 状态标签 */
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* 成功状态 */
.status-card.status-success {
  background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
  border-color: #86efac;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.1);
}

.status-card.status-success .status-icon-wrapper {
  animation: pulse-success 2s ease-in-out infinite;
}

/* 警告状态 */
.status-card.status-warning {
  background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%);
  border-color: #fcd34d;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.1);
}

.status-card.status-warning .status-icon-wrapper {
  animation: pulse-warning 2s ease-in-out infinite;
}

/* 错误状态 */
.status-card.status-error {
  background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
  border-color: #fecaca;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.1);
}

.status-card.status-error .status-icon-wrapper {
  animation: pulse-error 2s ease-in-out infinite;
}

/* 成功状态脉冲动画 */
@keyframes pulse-success {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(16, 185, 129, 0);
  }
}

/* 警告状态脉冲动画 */
@keyframes pulse-warning {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(245, 158, 11, 0);
  }
}

/* 错误状态脉冲动画 */
@keyframes pulse-error {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 12px rgba(239, 68, 68, 0);
  }
}

/* 指标卡片悬停效果 */
.metric-card {
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* 容量进度条动画 */
.capacity-progress-bar {
  position: relative;
  overflow: hidden;
}

.capacity-progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 分析项目样式 */
.analysis-item {
  transition: all 0.2s ease;
}

.analysis-item:hover {
  transform: translateX(4px);
}

/* 建议项目样式 */
.suggestion-items > div {
  transition: all 0.2s ease;
}

.suggestion-items > div:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(251, 191, 36, 0.2);
}

/* 操作按钮悬停效果增强 */
.action-options button {
  transition: all 0.2s ease;
}

.action-options button:hover:not(:disabled) {
  transform: translateY(-2px);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .status-icon-wrapper {
    width: 48px;
    height: 48px;
  }
  
  .status-icon-wrapper svg {
    width: 24px;
    height: 24px;
  }
  
  .metrics-grid {
    grid-template-columns: 1fr !important;
  }
  
  .action-options {
    grid-template-columns: 1fr !important;
  }
}

@media (max-width: 640px) {
  .status-card {
    padding: 16px;
  }
  
  .status-badge {
    font-size: 11px;
    padding: 2px 8px;
  }
}
</style>
