package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.ArrayList;

/**
 * 考官实体" * 表示一个考官的基本信息和能力
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Examiner {
    
    private Long id;
    private String name;
    private String employeeId;
    private String department;
    private String position;
    private String specialization;
    private List<String> qualifications;
    private boolean isAvailable;
    private int maxExamsPerDay;
    private List<String> unavailableDates;
    
    public Examiner() {
        this.qualifications = new ArrayList<>();
        this.unavailableDates = new ArrayList<>();
        this.isAvailable = true;
        this.maxExamsPerDay = 3; // 默认每天最"场考试
    }
    
    public Examiner(Long id, String name, String employeeId, String department) {
        this();
        this.id = id;
        this.name = name;
        this.employeeId = employeeId;
        this.department = department;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmployeeId() {
        return employeeId;
    }
    
    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }
    
    public String getDepartment() {
        return department;
    }
    
    public void setDepartment(String department) {
        this.department = department;
    }
    
    public String getPosition() {
        return position;
    }
    
    public void setPosition(String position) {
        this.position = position;
    }
    
    public String getSpecialization() {
        return specialization;
    }
    
    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }
    
    public List<String> getQualifications() {
        return qualifications;
    }
    
    public void setQualifications(List<String> qualifications) {
        this.qualifications = qualifications;
    }
    
    public boolean isAvailable() {
        return isAvailable;
    }
    
    public void setAvailable(boolean available) {
        isAvailable = available;
    }
    
    public int getMaxExamsPerDay() {
        return maxExamsPerDay;
    }
    
    public void setMaxExamsPerDay(int maxExamsPerDay) {
        this.maxExamsPerDay = maxExamsPerDay;
    }
    
    public List<String> getUnavailableDates() {
        return unavailableDates;
    }
    
    public void setUnavailableDates(List<String> unavailableDates) {
        this.unavailableDates = unavailableDates;
    }
    
    // 便利方法
    public void addQualification(String qualification) {
        if (this.qualifications == null) {
            this.qualifications = new ArrayList<>();
        }
        this.qualifications.add(qualification);
    }
    
    public void addUnavailableDate(String date) {
        if (this.unavailableDates == null) {
            this.unavailableDates = new ArrayList<>();
        }
        this.unavailableDates.add(date);
    }
    
    public boolean hasQualification(String qualification) {
        return this.qualifications != null && this.qualifications.contains(qualification);
    }
    
    public boolean isUnavailableOn(String date) {
        return this.unavailableDates != null && this.unavailableDates.contains(date);
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Examiner examiner = (Examiner) o;
        return id != null && id.equals(examiner.id);
    }
    
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
    
    @Override
    public String toString() {
        return "Examiner{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", employeeId='" + employeeId + '\'' +
                ", department='" + department + '\'' +
                ", position='" + position + '\'' +
                '}';
    }
}



