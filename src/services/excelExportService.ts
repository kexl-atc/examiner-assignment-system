/**
 * Excel 导出服务（带样式支持）
 * 使用 ExcelJS 实现带颜色的 Excel 导出
 */

import ExcelJS from 'exceljs'

export interface ExportScheduleRecord {
  student: string
  department: string
  date1: string
  date2: string
  type1?: string
  type2?: string
  examDays?: 1 | 2
  examiner1_1: string
  examiner1_2: string
  backup1: string
  examiner2_1: string
  examiner2_2: string
  backup2: string
  manualEdits?: Array<{
    field: string
    oldValue: string
    newValue: string
    conflicts?: Array<{
      type: string
      severity: string
      message: string
    }>
    isForced?: boolean
  }>
  constraintViolations?: Array<{
    field: string
    type: string
    severity: string
    message: string
  }>
}

interface CellColorInfo {
  fill: {
    type: 'pattern'
    pattern: 'solid'
    fgColor: { argb: string }
  }
  font?: {
    bold?: boolean
    color?: { argb: string }
  }
}

class ExcelExportService {
  /**
   * 导出排班表为 Excel 文件（带颜色）
   */
  async exportScheduleToExcel(
    records: ExportScheduleRecord[],
    filename: string = '排班表.xlsx'
  ): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log('📊 [导出Excel] 开始导出，记录数量:', records.length)
    process.env.NODE_ENV === 'development' && console.log(
      '📊 [导出Excel] 前3条记录的type1和type2:',
      records.slice(0, 3).map(r => ({
        student: r.student,
        type1: r.type1,
        type2: r.type2,
        examDays: r.examDays,
        date2: r.date2,
      }))
    )

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('排班表')

    // 设置列宽
    worksheet.columns = [
      { header: '所在科室', key: 'department', width: 15 },
      { header: '学员', key: 'student', width: 12 },
      { header: '第一天日期', key: 'date1', width: 12 },
      { header: '第一天类型', key: 'type1', width: 12 },
      { header: '第一天考官一', key: 'examiner1_1', width: 12 },
      { header: '第一天考官二', key: 'examiner1_2', width: 12 },
      { header: '第一天备份考官', key: 'backup1', width: 14 },
      { header: '第二天日期', key: 'date2', width: 12 },
      { header: '第二天类型', key: 'type2', width: 12 },
      { header: '第二天考官一', key: 'examiner2_1', width: 12 },
      { header: '第二天考官二', key: 'examiner2_2', width: 12 },
      { header: '第二天备份考官', key: 'backup2', width: 14 },
    ]

    // 设置表头样式
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }, // 蓝色背景
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
    headerRow.height = 25

    // 添加数据行
    for (const record of records) {
      // ✅ 直接使用record中已经处理好的type1和type2（SchedulesPage已生成）
      const row = worksheet.addRow({
        department: record.department || '',
        student: record.student || '',
        date1: record.date1 || '',
        type1: record.type1 || '现场+模拟机1', // 使用已生成的类型
        examiner1_1: record.examiner1_1 || '-',
        examiner1_2: record.examiner1_2 || '-',
        backup1: record.backup1 || '-',
        date2: record.date2 || '',
        type2: record.type2 || '模拟机2+口试', // 使用已生成的类型
        examiner2_1: record.examiner2_1 || '-',
        examiner2_2: record.examiner2_2 || '-',
        backup2: record.backup2 || '-',
      })

      // 设置行高和对齐
      row.height = 20
      row.alignment = { vertical: 'middle', horizontal: 'center' }

      // 应用单元格颜色（根据人工修改和约束违反）
      this.applyCellColors(row, record)
    }

    // 添加边框
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        }
      })
    })

    // 生成并下载文件
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    process.env.NODE_ENV === 'development' && console.log('✅ 排班表导出成功:', filename)
  }

  /**
   * 应用单元格颜色
   */
  private applyCellColors(row: ExcelJS.Row, record: ExportScheduleRecord): void {
    const examinerFields = [
      { field: 'examiner1_1', colNumber: 5 },
      { field: 'examiner1_2', colNumber: 6 },
      { field: 'backup1', colNumber: 7 },
      { field: 'examiner2_1', colNumber: 10 },
      { field: 'examiner2_2', colNumber: 11 },
      { field: 'backup2', colNumber: 12 },
    ]

    for (const { field, colNumber } of examinerFields) {
      const cell = row.getCell(colNumber)
      const colorInfo = this.getCellColorInfo(record, field)

      if (colorInfo) {
        cell.fill = colorInfo.fill
        if (colorInfo.font) {
          cell.font = { ...cell.font, ...colorInfo.font }
        }
      }
    }
  }

  /**
   * 获取单元格颜色信息
   */
  private getCellColorInfo(record: ExportScheduleRecord, field: string): CellColorInfo | null {
    // 检查是否有约束违反（自动检测到的冲突）
    const violation = record.constraintViolations?.find((v: any) => v.field === field)
    if (violation) {
      return {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFCD34D' }, // 黄色 - 约束违反
        },
      }
    }

    // 检查是否有人工修改
    const manualEdit = record.manualEdits?.find((e: any) => e.field === field)
    if (manualEdit) {
      // 判断修改后的冲突级别
      const hasHardConflict = manualEdit.conflicts?.some(
        (c: any) => c.type === 'hard' || c.severity === 'high'
      )
      const hasSoftConflict = manualEdit.conflicts?.some(
        (c: any) => c.type === 'soft' || c.severity === 'medium' || c.severity === 'low'
      )

      if (manualEdit.isForced || hasHardConflict) {
        // 红色 - 强制修改或存在硬冲突
        return {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFCA5A5' }, // 红色
          },
          font: {
            bold: true,
            color: { argb: 'FF7F1D1D' }, // 深红色文字
          },
        }
      } else if (hasSoftConflict) {
        // 橙色 - 软冲突
        return {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFCD7A1' }, // 橙色
          },
          font: {
            bold: true,
            color: { argb: 'FF92400E' }, // 深橙色文字
          },
        }
      } else {
        // 绿色 - 无冲突的修改
        return {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFB7E5CB' }, // 绿色
          },
          font: {
            bold: true,
            color: { argb: 'FF065F46' }, // 深绿色文字
          },
        }
      }
    }

    return null // 无特殊颜色
  }

  /**
   * 导出带图例说明的排班表
   */
  async exportScheduleWithLegend(
    records: ExportScheduleRecord[],
    filename: string = '排班表（含图例）.xlsx'
  ): Promise<void> {
    process.env.NODE_ENV === 'development' && console.log('📊 [导出Excel带图例] 开始导出，记录数量:', records.length)
    process.env.NODE_ENV === 'development' && console.log(
      '📊 [导出Excel带图例] 前3条记录的type1和type2:',
      records.slice(0, 3).map(r => ({
        student: r.student,
        type1: r.type1,
        type2: r.type2,
        examDays: r.examDays,
        date2: r.date2,
      }))
    )

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('排班表')

    // 添加图例说明
    worksheet.mergeCells('A1:D1')
    const legendTitle = worksheet.getCell('A1')
    legendTitle.value = '📋 排班表颜色图例'
    legendTitle.font = { bold: true, size: 14, color: { argb: 'FF1F2937' } }
    legendTitle.alignment = { vertical: 'middle', horizontal: 'center' }
    legendTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    }

    // 添加图例项
    const legends = [
      {
        label: '🟡 黄色',
        description: '系统检测到约束违反（不可用时间/工作量超标/轮班不匹配）',
        color: 'FFFCD34D',
      },
      { label: '🟢 绿色', description: '人工修改后无冲突', color: 'FFB7E5CB' },
      { label: '🟠 橙色', description: '人工修改后存在软冲突（科室不匹配等）', color: 'FFFCD7A1' },
      {
        label: '🔴 红色',
        description: '人工强制修改或存在硬冲突（不可用时间/轮班不匹配）',
        color: 'FFFCA5A5',
      },
    ]

    let legendRow = 2
    for (const legend of legends) {
      const cell = worksheet.getCell(`A${legendRow}`)
      cell.value = legend.label
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: legend.color },
      }

      worksheet.mergeCells(`B${legendRow}:D${legendRow}`)
      const descCell = worksheet.getCell(`B${legendRow}`)
      descCell.value = legend.description
      descCell.alignment = { vertical: 'middle', horizontal: 'left' }

      legendRow++
    }

    // 空一行
    legendRow++

    // 设置列宽（从排班数据开始的行）
    worksheet.columns = [
      { header: '', key: '', width: 15 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 14 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 12 },
      { header: '', key: '', width: 14 },
    ]

    // 添加排班表头
    const headers = [
      '所在科室',
      '学员',
      '第一天日期',
      '第一天类型',
      '第一天考官一',
      '第一天考官二',
      '第一天备份考官',
      '第二天日期',
      '第二天类型',
      '第二天考官一',
      '第二天考官二',
      '第二天备份考官',
    ]

    const headerRow = worksheet.getRow(legendRow)
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = header
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    headerRow.height = 25

    // 添加数据行
    let dataRow = legendRow + 1
    for (const record of records) {
      const row = worksheet.getRow(dataRow)

      // ✅ 直接使用record中已经处理好的type1和type2（SchedulesPage已生成）
      const values = [
        record.department || '',
        record.student || '',
        record.date1 || '',
        record.type1 || '现场+模拟机1', // 使用已生成的类型
        record.examiner1_1 || '-',
        record.examiner1_2 || '-',
        record.backup1 || '-',
        record.date2 || '',
        record.type2 || '模拟机2+口试', // 使用已生成的类型
        record.examiner2_1 || '-',
        record.examiner2_2 || '-',
        record.backup2 || '-',
      ]

      values.forEach((value, index) => {
        const cell = row.getCell(index + 1)
        cell.value = value
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      row.height = 20

      // 应用考官单元格颜色
      const examinerFields = [
        { field: 'examiner1_1', colNumber: 5 },
        { field: 'examiner1_2', colNumber: 6 },
        { field: 'backup1', colNumber: 7 },
        { field: 'examiner2_1', colNumber: 10 },
        { field: 'examiner2_2', colNumber: 11 },
        { field: 'backup2', colNumber: 12 },
      ]

      for (const { field, colNumber } of examinerFields) {
        const cell = row.getCell(colNumber)
        const colorInfo = this.getCellColorInfo(record, field)

        if (colorInfo) {
          cell.fill = colorInfo.fill
          if (colorInfo.font) {
            cell.font = { ...cell.font, ...colorInfo.font }
          }
        }
      }

      dataRow++
    }

    // 添加边框
    worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber >= legendRow) {
        row.eachCell((cell: ExcelJS.Cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
            right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          }
        })
      }
    })

    // 生成并下载文件
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    process.env.NODE_ENV === 'development' && console.log('✅ 带图例的排班表导出成功:', filename)
  }
}

export const excelExportService = new ExcelExportService()
export default excelExportService
