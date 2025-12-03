import mysql from 'mysql2/promise'

const connection = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'echoflow_db',
    dateStrings: true, // 將日期以字串格式返回
})

// 測試連線函數
export async function testConnection() {
    try {
        const conn = await connection.getConnection()
        console.log('資料庫連線成功!')
        console.log(` 資料庫: ${conn.config.database}`)

        conn.release()
        return true
    } catch (error) {
        console.error('資料庫連線失敗:', error.message)
        console.error('請檢查以下項目:')
        console.error('1. MySQL 服務是否正在運行')
        console.error('2. 資料庫連線設定是否正確')
        console.error('3. 資料庫 echoflow_db 是否存在')
        return false
    }
}

// 測試連線並返回連線狀態
export async function getConnectionStatus() {
    try {
        await connection.execute('SELECT 1')
        return { success: true, message: '連線正常' }
    } catch (error) {
        return { success: false, message: error.message }
    }
}

// 初始化資料庫連線
export async function initializeDatabase() {
    console.log(' 正在測試資料庫連線...')
    return await testConnection()
}

export default connection
