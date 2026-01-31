package com.examiner.scheduler.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.ArrayList;

/**
 * 考试房间实体" * 表示一个考试房间的基本信息和设施
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Room {
    
    private Long id;
    private String roomCode;
    private String roomName;
    private String building;
    private String floor;
    private int capacity;
    private String roomType;
    private List<String> facilities;
    private boolean isAvailable;
    private List<String> unavailableDates;
    private String location;
    
    public Room() {
        this.facilities = new ArrayList<>();
        this.unavailableDates = new ArrayList<>();
        this.isAvailable = true;
    }
    
    public Room(Long id, String roomCode, String roomName, int capacity) {
        this();
        this.id = id;
        this.roomCode = roomCode;
        this.roomName = roomName;
        this.capacity = capacity;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getRoomCode() {
        return roomCode;
    }
    
    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }
    
    public String getRoomName() {
        return roomName;
    }
    
    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }
    
    public String getBuilding() {
        return building;
    }
    
    public void setBuilding(String building) {
        this.building = building;
    }
    
    public String getFloor() {
        return floor;
    }
    
    public void setFloor(String floor) {
        this.floor = floor;
    }
    
    public int getCapacity() {
        return capacity;
    }
    
    public void setCapacity(int capacity) {
        this.capacity = capacity;
    }
    
    public String getRoomType() {
        return roomType;
    }
    
    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }
    
    public List<String> getFacilities() {
        return facilities;
    }
    
    public void setFacilities(List<String> facilities) {
        this.facilities = facilities;
    }
    
    public boolean isAvailable() {
        return isAvailable;
    }
    
    public void setAvailable(boolean available) {
        isAvailable = available;
    }
    
    public List<String> getUnavailableDates() {
        return unavailableDates;
    }
    
    public void setUnavailableDates(List<String> unavailableDates) {
        this.unavailableDates = unavailableDates;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    // 便利方法
    public void addFacility(String facility) {
        if (this.facilities == null) {
            this.facilities = new ArrayList<>();
        }
        this.facilities.add(facility);
    }
    
    public void addUnavailableDate(String date) {
        if (this.unavailableDates == null) {
            this.unavailableDates = new ArrayList<>();
        }
        this.unavailableDates.add(date);
    }
    
    public boolean hasFacility(String facility) {
        return this.facilities != null && this.facilities.contains(facility);
    }
    
    public boolean isUnavailableOn(String date) {
        return this.unavailableDates != null && this.unavailableDates.contains(date);
    }
    
    public boolean canAccommodate(int requiredCapacity) {
        return this.capacity >= requiredCapacity;
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Room room = (Room) o;
        return id != null && id.equals(room.id);
    }
    
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
    
    @Override
    public String toString() {
        return "Room{" +
                "id=" + id +
                ", roomCode='" + roomCode + '\'' +
                ", roomName='" + roomName + '\'' +
                ", building='" + building + '\'' +
                ", capacity=" + capacity +
                '}';
    }
}



