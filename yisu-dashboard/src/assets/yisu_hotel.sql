/*
 第五期前端训练营 - 大作业数据库初始化脚本
 业务模块：易宿酒店预订平台
 排序逻辑：基础表 -> 关联表 -> 业务统计表
*/

-- ==========================================
-- 1. 全平台统一用户表 (基础表)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE NOT NULL COMMENT '手机号，作为唯一登录账号',
    password VARCHAR(255) NOT NULL COMMENT '加密存储的密码',
    username VARCHAR(50) DEFAULT '新用户' COMMENT '用户昵称',
    avatar_url VARCHAR(500) COMMENT '用户头像地址',
    role ENUM('user', 'merchant', 'admin') NOT NULL DEFAULT 'user' COMMENT '角色权限：普通用户/商户/管理员',
    status ENUM('active', 'suspended') DEFAULT 'active' COMMENT '账号状态：正常/封禁',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role)
) COMMENT='账号基础表';

-- ==========================================
-- 2. 商户扩展信息表 (关联 users)
-- ==========================================
CREATE TABLE IF NOT EXISTS merchant_profiles (
    user_id INT PRIMARY KEY COMMENT '关联users表',
    license_image_url VARCHAR(500) COMMENT '营业执照图片地址，用于管理员审核',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '商户入驻审核状态',
    apply_reason VARCHAR(200) COMMENT '入驻理由（商户申请时自述）',
    rejection_reason VARCHAR(200) COMMENT '管理员驳回理由',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) COMMENT='商户资质表';

-- ==========================================
-- 3. 酒店基本信息表 (关联 users)
-- ==========================================
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id INT PRIMARY KEY AUTO_INCREMENT,
    merchant_id INT NOT NULL COMMENT '所属商户ID',
    name_zh VARCHAR(200) NOT NULL COMMENT '酒店中文名',
    name_en VARCHAR(200) COMMENT '酒店英文名',
    phone VARCHAR(20) NOT NULL COMMENT '酒店前台联系电话',
    star_rating TINYINT DEFAULT 3 COMMENT '星级标准：1-5星',
    province VARCHAR(50) COMMENT '省份',
    city VARCHAR(50) COMMENT '城市',
    address VARCHAR(500) NOT NULL COMMENT '详细地址',
    latitude DECIMAL(10, 6) COMMENT '纬度',
    longitude DECIMAL(10, 6) COMMENT '经度',
    description TEXT COMMENT '酒店简介',
    cover_url VARCHAR(500) COMMENT '主封面图（用于列表页展示）',
    opening_date DATE COMMENT '开业时间',
    status ENUM('draft', 'pending', 'approved', 'rejected', 'offline') DEFAULT 'draft' COMMENT '生命周期：草稿/审核中/已上线/驳回/已下线',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES users(user_id),
    INDEX idx_city_status (city, status)
) COMMENT='酒店信息主表';

-- ==========================================
-- 4. 媒体资源表 (关联 hotels)
-- ==========================================
CREATE TABLE IF NOT EXISTS hotel_media (
    media_id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    media_type ENUM('image', 'video') DEFAULT 'image' COMMENT '资源类型：图片或视频',
    media_url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0 COMMENT '排序权值,值越大越靠前',
    is_cover BOOLEAN DEFAULT FALSE COMMENT '是否设为封面',
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE
) COMMENT='媒体资源表';

-- ==========================================
-- 5. 房型定义表 (关联 hotels)
-- ==========================================
CREATE TABLE IF NOT EXISTS room_types (
    room_type_id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '房型名称',
    bed_info VARCHAR(50) COMMENT '床型信息',
    max_guests INT DEFAULT 2 COMMENT '最大入住人数',
    base_price DECIMAL(10,2) NOT NULL COMMENT '默认价格/起步价',
    total_rooms INT NOT NULL COMMENT '该房型拥有的房间总数',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态：正常/停售',
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE
) COMMENT='房型定义表';

-- ==========================================
-- 6. 设施标签关联表 (解耦表)
-- ==========================================
CREATE TABLE IF NOT EXISTS tag_relations (
    relation_id INT PRIMARY KEY AUTO_INCREMENT,
    target_type ENUM('hotel', 'room_type') NOT NULL COMMENT '标签挂载对象（酒店、具体房型）',
    target_id INT NOT NULL COMMENT '对应的酒店ID或房型ID',
    tag_id INT NOT NULL COMMENT '标签ID(1:WiFi, 2:停车场等)',
    UNIQUE KEY uk_target_tag (target_type, target_id, tag_id)
) COMMENT='设施标签关联表';

-- ==========================================
-- 7. 价格规则申请表 (关联 room_types)
-- ==========================================
CREATE TABLE IF NOT EXISTS price_rules (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    room_type_id INT NOT NULL,
    start_date DATE NOT NULL COMMENT '规则生效起始日期',
    end_date DATE NOT NULL COMMENT '规则生效结束日期',
    day_of_week VARCHAR(20) DEFAULT '1,2,3,4,5,6,7' COMMENT '周几生效',
    adjust_type ENUM('fixed', 'percent', 'plus') NOT NULL COMMENT '调整方式：固定一口价/百分比(打折)/在底价上加价',
    adjust_value DECIMAL(10,2) NOT NULL COMMENT '调整数值',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核规则状态',
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id) ON DELETE CASCADE
) COMMENT='调价规则表';

-- ==========================================
-- 8. 房型日历落地表 (关联 room_types)
-- ==========================================
CREATE TABLE IF NOT EXISTS room_calendar (
    calendar_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_type_id INT NOT NULL,
    date DATE NOT NULL COMMENT '具体的某一天',
    final_price DECIMAL(10,2) NOT NULL COMMENT '经计算规则后的今日最终价',
    available_rooms INT NOT NULL COMMENT '今日剩余库存',
    status ENUM('open', 'closed') DEFAULT 'open' COMMENT '当日是否停售',
    UNIQUE KEY uk_room_date (room_type_id, date),
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id) ON DELETE CASCADE
) COMMENT='日历库存表';

-- ==========================================
-- 9. 审核申请中心
-- ==========================================
CREATE TABLE IF NOT EXISTS audits_apply (
    apply_id INT PRIMARY KEY AUTO_INCREMENT,
    target_type ENUM('hotel_apply', 'hotel_update', 'price_rule', 'ad_apply', 'hotel_recovery') NOT NULL COMMENT '审核类型：新店入驻/信息变更/价格规则/广告/恢复上线',
    target_id INT NOT NULL COMMENT '对应业务表的ID',
    hotel_id INT COMMENT '冗余酒店ID',
    merchant_id INT NOT NULL COMMENT '提交人ID',
    change_data JSON NOT NULL COMMENT '修改后的数据快照，审核通过后才覆盖原表',
    apply_reason VARCHAR(500) COMMENT '申请说明',
    audit_status ENUM('pending', 'processing', 'completed') DEFAULT 'pending' COMMENT '审核进度',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) COMMENT='审核申请中心流水表';

-- ==========================================
-- 10. 审核日志 (关联 users, audits_apply)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    apply_id INT NOT NULL,
    admin_id INT NOT NULL COMMENT '审核管理员ID',
    action ENUM('approve', 'reject') NOT NULL COMMENT '操作：通过/驳回',
    reason TEXT COMMENT '驳回原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(user_id)
) COMMENT='审核历史操作日志';

-- ==========================================
-- 11. 广告位规则表 (管理员管理)
-- ==========================================
CREATE TABLE IF NOT EXISTS ad_rules (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    price DECIMAL(8,2) NOT NULL COMMENT '广告位租金/天',
    start_date DATE NOT NULL COMMENT '生效开始日期',
    end_date DATE COMMENT '生效结束日期',
    min_days INT DEFAULT 7 COMMENT '最小投放天数',
    max_days INT DEFAULT 30 COMMENT '最大投放天数',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='广告位规则配置表';

-- ==========================================
-- 12. 广告购买订单表 (关联 ad_rules, hotels, users)
-- ==========================================
CREATE TABLE IF NOT EXISTS ad_orders (
    ad_order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '广告订单号',
    hotel_id INT NOT NULL COMMENT '申请广告的酒店ID',
    merchant_id INT NOT NULL COMMENT '商户ID',
    rule_id INT NOT NULL COMMENT '关联规则ID',
    image_url VARCHAR(500) NOT NULL COMMENT '广告图地址',
    start_date DATE NOT NULL COMMENT '计划开始投放日期',
    end_date DATE NOT NULL COMMENT '计划结束投放日期',
    unit_price DECIMAL(8,2) NOT NULL COMMENT '下单单价',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '支付总额',
    payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid' COMMENT '支付状态',
    audit_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
    rejection_reason VARCHAR(255) COMMENT '驳回原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id),
    FOREIGN KEY (merchant_id) REFERENCES users(user_id),
    FOREIGN KEY (rule_id) REFERENCES ad_rules(rule_id)
) COMMENT='广告购买订单表';

-- ==========================================
-- 13. 广告投放表 (关联 ad_orders, hotels)
-- ==========================================
CREATE TABLE IF NOT EXISTS active_ads (
    ad_id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL COMMENT '展示的酒店',
    ad_order_id INT NULL COMMENT '关联广告订单ID',
    image_url VARCHAR(500) NOT NULL COMMENT 'Banner图',
    start_date DATE NOT NULL COMMENT '生效日期',
    end_date DATE NOT NULL COMMENT '失效日期',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (ad_order_id) REFERENCES ad_orders(ad_order_id) ON DELETE SET NULL
) COMMENT='广告生效展示表';

-- ==========================================
-- 14. 订单交易表 (关联 users, hotels)
-- ==========================================
CREATE TABLE IF NOT EXISTS orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(50) UNIQUE NOT NULL COMMENT '订单号',
    user_id INT NOT NULL COMMENT '下单用户ID',
    hotel_id INT NOT NULL,
    room_type_id INT NOT NULL,
    check_in_date DATE NOT NULL COMMENT '入住日期',
    check_out_date DATE NOT NULL COMMENT '离店日期',
    total_amount DECIMAL(10,2) NOT NULL COMMENT '实付总金额',
    commission_rate DECIMAL(5,2) DEFAULT 10.00 COMMENT '平台佣金比例(%)',
    commission_amount DECIMAL(10,2) GENERATED ALWAYS AS (total_amount * commission_rate / 100) STORED COMMENT '佣金金额',
    status ENUM('unpaid', 'paid', 'checked_in', 'completed', 'cancelled') DEFAULT 'unpaid' COMMENT '订单状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id)
) COMMENT='房源预订订单表';

-- ==========================================
-- 15. 佣金比例规则表 (管理员管理)
-- ==========================================
CREATE TABLE IF NOT EXISTS commission_rules (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    rate DECIMAL(5,2) NOT NULL COMMENT '佣金比例(%)',
    start_date DATE NOT NULL COMMENT '生效开始日期',
    end_date DATE COMMENT '生效结束日期',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dates (start_date, end_date)
) COMMENT='佣金费率配置表';

-- ==========================================
-- 16. 平台收入统计表
-- ==========================================
CREATE TABLE IF NOT EXISTS platform_finance_stats (
    stat_id INT PRIMARY KEY AUTO_INCREMENT,
    stat_date DATE NOT NULL COMMENT '统计日期',
    order_count INT DEFAULT 0 COMMENT '订单总数',
    order_amount DECIMAL(12,2) DEFAULT 0 COMMENT '订单总额',
    commission_income DECIMAL(12,2) DEFAULT 0 COMMENT '总佣金收入',
    ad_count INT DEFAULT 0 COMMENT '广告订单数',
    ad_income DECIMAL(12,2) DEFAULT 0 COMMENT '总广告费收入',
    total_income DECIMAL(12,2) DEFAULT 0 COMMENT '当日总流水',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date (stat_date),
    INDEX idx_date (stat_date DESC)
) COMMENT='平台财务统计日报';

-- ==========================================
-- 17. 酒店收支统计表 (关联 hotels)
-- ==========================================
CREATE TABLE IF NOT EXISTS hotel_finance_stats (
    stat_id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL COMMENT '酒店ID',
    stat_date DATE NOT NULL COMMENT '统计日期',
    order_income DECIMAL(12,2) DEFAULT 0 COMMENT '订单总收入',
    commission_paid DECIMAL(12,2) DEFAULT 0 COMMENT '应扣佣金',
    net_income DECIMAL(12,2) GENERATED ALWAYS AS (order_income - commission_paid) STORED COMMENT '结算净收入',
    ad_expense DECIMAL(12,2) DEFAULT 0 COMMENT '广告费支出',
    order_count INT DEFAULT 0 COMMENT '订单数',
    checkin_nights INT DEFAULT 0 COMMENT '入住间夜数',
    total_rooms INT DEFAULT 0 COMMENT '总房间数',
    sold_rooms INT DEFAULT 0 COMMENT '售出房间数',
    occupancy_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_rooms > 0 THEN (sold_rooms * 100.0) / total_rooms ELSE 0 END
    ) STORED COMMENT '当日入住率',
    refund_count INT DEFAULT 0 COMMENT '退款订单数',
    refund_amount DECIMAL(12,2) DEFAULT 0 COMMENT '退款金额',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_hotel_date (hotel_id, stat_date),
    FOREIGN KEY (hotel_id) REFERENCES hotels(hotel_id), -- 这里已加上缺少的逗号
    INDEX idx_date (stat_date DESC),
    INDEX idx_hotel_date (hotel_id, stat_date DESC)
) COMMENT='酒店财务统计日报';

-- ==========================================
-- 18. 用户收藏表 (关联 users)
-- ==========================================
CREATE TABLE IF NOT EXISTS favorites (
    favorite_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_hotel (user_id, hotel_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) COMMENT='用户收藏表';