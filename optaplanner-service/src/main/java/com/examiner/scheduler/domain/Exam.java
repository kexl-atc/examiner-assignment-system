package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 考试实体类
 * 表示一次考试的基本信息
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Exam {
    
    private Long id;
    private String examCode;
    private String examName;
    private String examType;
    private String subject;
    private int duration; // 考试时长（分钟）
    private String description;
    
    public Exam() {}
    
    public Exam(Long id, String examCode, String examName, String examType) {
        this.id = id;
        this.examCode = examCode;
        this.examName = examName;
        this.examType = examType;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getExamCode() {
        return examCode;
    }
    
    public void setExamCode(String examCode) {
        this.examCode = examCode;
    }
    
    public String getExamName() {
        return examName;
    }
    
    public void setExamName(String examName) {
        this.examName = examName;
    }
    
    public String getExamType() {
        return examType;
    }
    
    public void setExamType(String examType) {
        this.examType = examType;
    }
    
    public String getSubject() {
        return subject;
    }
    
    public void setSubject(String subject) {
        this.subject = subject;
    }
    
    public int getDuration() {
        return duration;
    }
    
    public void setDuration(int duration) {
        this.duration = duration;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Exam exam = (Exam) o;
        return id != null && id.equals(exam.id);
    }
    
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
    
    @Override
    public String toString() {
        return "Exam{" +
                "id=" + id +
                ", examCode='" + examCode + '\'' +
                ", examName='" + examName + '\'' +
                ", examType='" + examType + '\'' +
                '}';
    }
}



