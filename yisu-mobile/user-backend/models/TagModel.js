const pool = require('../utils/db');

class TagModel {
    // 获取所有标签（按类型分组）
    static async getAllTags() {
        const sql = `
            SELECT tag_id, name, tag_type, sort_order 
            FROM tags 
            ORDER BY tag_type, sort_order
        `;
        const [rows] = await pool.query(sql);
        
        // 按类型分组
        const grouped = {
            facility: rows.filter(tag => tag.tag_type === 'facility'),
            special: rows.filter(tag => tag.tag_type === 'special')
        };
        
        return grouped;
    }
    
    // 根据ID获取标签
    static async findByIds(tagIds) {
        const sql = 'SELECT * FROM tags WHERE tag_id IN (?)';
        const [rows] = await pool.query(sql, [tagIds]);
        return rows;
    }
}

module.exports = TagModel;