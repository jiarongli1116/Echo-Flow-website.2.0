import express from 'express'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import connection from '../connect.js'

const secretKey = process.env.JWT_SECRET_KEY
const router = express.Router()

// 檢查 JWT Token 的中間件函數
function checkToken(req, res, next) {
    let token = req.get('Authorization')
    if (token && token.includes('Bearer ')) {
        token = token.slice(7)
        jwt.verify(token, secretKey, (error, decoded) => {
            if (error) {
                console.log(error)
                res.status(401).json({
                    status: 'error',
                    message: '登入驗證失效，請重新登入',
                })
                return
            }
            req.decoded = decoded
            next()
        })
    } else {
        res.status(401).json({
            status: 'error',
            message: '無登入驗證資料，請重新登入',
        })
    }
}

// 獲取用戶的所有地址
router.get('/', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account

        const sql = `
      SELECT id, zipcode, city, district, address, recipient_name, recipient_phone, is_default as isDefault, created_at, updated_at
      FROM users_addresses 
      WHERE users_id = ? 
      ORDER BY is_default DESC, created_at DESC
    `

        const [addresses] = await connection.execute(sql, [userId])

        console.log(`使用者 ${userAccount} 查詢了 ${addresses.length} 筆地址`)

        res.status(200).json({
            status: 'success',
            data: {
                addresses,
                count: addresses.length,
                userId: userId,
            },
            message: '已獲取地址列表',
        })
    } catch (error) {
        console.log('獲取地址列表錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '獲取地址列表失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 搜尋地址
router.get('/search', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account
        const key = req.query.key

        if (!key) {
            const err = new Error('請提供搜尋關鍵字')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const sql = `
      SELECT id, zipcode, city, district, address, recipient_name, recipient_phone, is_default as isDefault, created_at, updated_at
      FROM users_addresses 
      WHERE users_id = ? 
        AND (
          zipcode LIKE ? OR 
          city LIKE ? OR 
          district LIKE ? OR 
          address LIKE ? OR 
          recipient_name LIKE ? OR 
          recipient_phone LIKE ?
        )
      ORDER BY is_default DESC, created_at DESC
      LIMIT 20
    `

        const searchPattern = `%${key}%`
        const [addresses] = await connection.execute(sql, [
            userId,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
        ])

        console.log(`使用者 ${userAccount} 搜尋地址關鍵字: ${key}，找到 ${addresses.length} 筆結果`)

        res.status(200).json({
            status: 'success',
            data: {
                key,
                addresses,
                count: addresses.length,
                userId: userId,
            },
            message: `搜尋到 ${addresses.length} 個地址`,
        })
    } catch (error) {
        console.log('搜尋地址錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '搜尋地址失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 獲取特定地址
router.get('/:id', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account
        const addressId = req.params.id

        if (!addressId) {
            const err = new Error('請提供地址 ID')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        const sql = `
      SELECT id, zipcode, city, district, address, recipient_name, recipient_phone, is_default as isDefault, created_at, updated_at
      FROM users_addresses 
      WHERE id = ? AND users_id = ?
    `

        const [addresses] = await connection.execute(sql, [addressId, userId])

        if (addresses.length === 0) {
            const err = new Error('找不到地址或無權限查看')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        console.log(`使用者 ${userAccount} 查詢了地址 ID: ${addressId}`)

        res.status(200).json({
            status: 'success',
            data: addresses[0],
            message: '查詢地址成功',
        })
    } catch (error) {
        console.log('獲取特定地址錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '獲取地址失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 新增地址
router.post('/', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account
        const { zipcode, city, district, address, recipient_name, recipient_phone, isDefault } = req.body

        // 驗證必填欄位
        if (!zipcode || !city || !district || !address || !recipient_name || !recipient_phone) {
            const err = new Error('郵遞區號、縣市、區域、詳細地址、收件人姓名和手機號碼為必填欄位')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 檢查用戶現有的地址數量
        const [existingAddresses] = await connection.execute(
            'SELECT COUNT(*) as count FROM users_addresses WHERE users_id = ?',
            [userId]
        )

        const addressCount = existingAddresses[0].count

        // 如果是第一個地址，強制設為預設
        let finalIsDefault = isDefault
        if (addressCount === 0) {
            finalIsDefault = true
            console.log(`使用者 ${userAccount} 新增第一個地址，自動設為預設`)
        }

        // 如果設為預設地址，先將其他地址設為非預設
        if (finalIsDefault) {
            await connection.execute('UPDATE users_addresses SET is_default = 0 WHERE users_id = ?', [userId])
            console.log(`使用者 ${userAccount} 將其他地址設為非預設`)
        }

        // 新增地址
        const sql = `
      INSERT INTO users_addresses (users_id, zipcode, city, district, address, recipient_name, recipient_phone, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `

        const [result] = await connection.execute(sql, [
            userId,
            zipcode,
            city,
            district,
            address,
            recipient_name,
            recipient_phone,
            finalIsDefault ? 1 : 0,
        ])

        // 獲取新增的地址
        const [newAddress] = await connection.execute(
            'SELECT id, zipcode, city, district, address, recipient_name, recipient_phone, is_default as isDefault, created_at, updated_at FROM users_addresses WHERE id = ?',
            [result.insertId]
        )

        console.log(`使用者 ${userAccount} 成功新增地址: ${city}${district}${address}`)

        res.status(201).json({
            status: 'success',
            data: {
                address: newAddress[0],
                totalAddresses: addressCount + 1,
                isFirstAddress: addressCount === 0,
            },
            message: '地址新增成功',
        })
    } catch (error) {
        console.log('新增地址錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '新增地址失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 更新地址
router.put('/:id', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account
        const addressId = req.params.id
        const { zipcode, city, district, address, recipient_name, recipient_phone, isDefault } = req.body

        // 調試日誌：顯示接收到的數據
        console.log(`🔍 地址更新請求 - 用戶: ${userAccount}, 地址ID: ${addressId}`)
        console.log('📥 接收到的數據:', {
            zipcode,
            city,
            district,
            address,
            recipient_name,
            recipient_phone,
            isDefault,
        })

        // 檢查至少要有一個欄位有資料
        if (
            !zipcode &&
            !city &&
            !district &&
            !address &&
            !recipient_name &&
            !recipient_phone &&
            isDefault === undefined
        ) {
            const err = new Error('請至少提供一個要更新的資料')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 檢查地址是否屬於當前用戶
        const [existingAddress] = await connection.execute(
            'SELECT id, zipcode, city, district, address, recipient_name, recipient_phone, is_default FROM users_addresses WHERE id = ? AND users_id = ?',
            [addressId, userId]
        )

        if (existingAddress.length === 0) {
            const err = new Error('地址不存在或無權限修改')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        const originalAddress = existingAddress[0]

        // 調試日誌：顯示原始地址數據
        console.log('📋 原始地址數據:', {
            zipcode: originalAddress.zipcode,
            city: originalAddress.city,
            district: originalAddress.district,
            address: originalAddress.address,
            recipient_name: originalAddress.recipient_name,
            recipient_phone: originalAddress.recipient_phone,
            is_default: originalAddress.is_default,
        })

        // 檢查用戶的地址總數和預設地址數量
        const [addressStats] = await connection.execute(
            'SELECT COUNT(*) as total, SUM(is_default) as defaultCount FROM users_addresses WHERE users_id = ?',
            [userId]
        )

        const totalAddresses = addressStats[0].total
        const defaultAddressesCount = addressStats[0].defaultCount || 0
        const isOnlyAddress = totalAddresses === 1
        const isOnlyDefaultAddress = defaultAddressesCount === 1 && originalAddress.is_default

        // 如果這是唯一的地址且用戶要取消預設，不允許
        if (isOnlyAddress && isDefault === false) {
            const err = new Error('至少需要保留一個預設地址，無法取消預設設定')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 如果這是唯一的預設地址且用戶要取消預設，不允許
        if (isOnlyDefaultAddress && isDefault === false) {
            const err = new Error('至少需要保留一個預設地址，無法取消預設設定')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        let updateFields = []
        let values = []
        let changedFields = []

        // 更嚴格的檢查：只更新實際有值且與原值不同的欄位
        if (zipcode !== undefined && zipcode !== null && zipcode !== '' && zipcode !== originalAddress.zipcode) {
            updateFields.push('zipcode = ?')
            values.push(zipcode)
            changedFields.push('郵遞區號')
            console.log('📝 郵遞區號將更新:', { from: originalAddress.zipcode, to: zipcode })
        }

        if (city !== undefined && city !== null && city !== '' && city !== originalAddress.city) {
            updateFields.push('city = ?')
            values.push(city)
            changedFields.push('縣市')
            console.log('📝 縣市將更新:', { from: originalAddress.city, to: city })
        }

        if (district !== undefined && district !== null && district !== '' && district !== originalAddress.district) {
            updateFields.push('district = ?')
            values.push(district)
            changedFields.push('區域')
            console.log('📝 區域將更新:', { from: originalAddress.district, to: district })
        }

        if (address !== undefined && address !== null && address !== '' && address !== originalAddress.address) {
            updateFields.push('address = ?')
            values.push(address)
            changedFields.push('詳細地址')
            console.log('📝 詳細地址將更新:', { from: originalAddress.address, to: address })
        }

        if (
            recipient_name !== undefined &&
            recipient_name !== null &&
            recipient_name !== '' &&
            recipient_name !== originalAddress.recipient_name
        ) {
            updateFields.push('recipient_name = ?')
            values.push(recipient_name)
            changedFields.push('收件人姓名')
            console.log('📝 收件人姓名將更新:', { from: originalAddress.recipient_name, to: recipient_name })
        }

        if (
            recipient_phone !== undefined &&
            recipient_phone !== null &&
            recipient_phone !== '' &&
            recipient_phone !== originalAddress.recipient_phone
        ) {
            updateFields.push('recipient_phone = ?')
            values.push(recipient_phone)
            changedFields.push('收件人電話')
            console.log('📝 收件人電話將更新:', { from: originalAddress.recipient_phone, to: recipient_phone })
        }

        if (isDefault !== undefined && isDefault !== originalAddress.is_default) {
            // 將布林值轉換為數字進行比較，避免類型不匹配
            const originalIsDefault = originalAddress.is_default ? 1 : 0
            const newIsDefault = isDefault ? 1 : 0

            if (newIsDefault !== originalIsDefault) {
                // 如果設為預設地址，先將其他地址設為非預設
                if (isDefault) {
                    await connection.execute(
                        'UPDATE users_addresses SET is_default = 0 WHERE users_id = ? AND id != ?',
                        [userId, addressId]
                    )
                }
                updateFields.push('is_default = ?')
                values.push(isDefault ? 1 : 0)
                changedFields.push(isDefault ? '設為預設地址' : '取消預設地址')
                console.log('📝 預設地址狀態將更新:', { from: originalAddress.is_default, to: isDefault })
            }
        }

        // 自動更新 updated_at 欄位
        updateFields.push('updated_at = NOW()')
        values.push(addressId, userId)

        // 更新地址
        const sql = `UPDATE users_addresses SET ${updateFields.join(', ')} WHERE id = ? AND users_id = ?`
        const [result] = await connection.execute(sql, values)

        if (result.affectedRows === 0) {
            const err = new Error('找不到要更新的地址或更新失敗')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        // 獲取更新後的地址
        const [updatedAddress] = await connection.execute(
            'SELECT id, zipcode, city, district, address, recipient_name, recipient_phone, is_default as isDefault, created_at, updated_at FROM users_addresses WHERE id = ?',
            [addressId]
        )

        console.log(`使用者 ${userAccount} 更新了地址 ${addressId}: ${changedFields.join('、')}`)

        res.status(200).json({
            status: 'success',
            data: {
                address: updatedAddress[0],
                updatedFields: changedFields,
                affectedRows: result.affectedRows,
            },
            message: '地址更新成功',
        })
    } catch (error) {
        console.log('更新地址錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '更新地址失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 刪除地址
router.delete('/:id', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account
        const addressId = req.params.id

        // 檢查地址是否屬於當前用戶
        const [existingAddress] = await connection.execute(
            'SELECT id, is_default, city, district, address, recipient_name FROM users_addresses WHERE id = ? AND users_id = ?',
            [addressId, userId]
        )

        if (existingAddress.length === 0) {
            const err = new Error('地址不存在或無權限刪除')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        const addressToDelete = existingAddress[0]

        // 檢查用戶的地址總數
        const [addressCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM users_addresses WHERE users_id = ?',
            [userId]
        )

        // 如果只有一個地址，不允許刪除
        if (addressCount[0].count === 1) {
            const err = new Error('至少需要保留一個地址，無法刪除')
            err.code = 400
            err.status = 'fail'
            throw err
        }

        // 如果刪除的是預設地址，將第一個地址設為預設
        if (addressToDelete.is_default) {
            const [otherAddresses] = await connection.execute(
                'SELECT id FROM users_addresses WHERE users_id = ? AND id != ? ORDER BY created_at ASC LIMIT 1',
                [userId, addressId]
            )

            if (otherAddresses.length > 0) {
                await connection.execute('UPDATE users_addresses SET is_default = 1 WHERE id = ?', [
                    otherAddresses[0].id,
                ])
                console.log(`使用者 ${userAccount} 刪除預設地址後，將地址 ${otherAddresses[0].id} 設為新的預設地址`)
            }
        }

        // 刪除地址
        const [result] = await connection.execute('DELETE FROM users_addresses WHERE id = ? AND users_id = ?', [
            addressId,
            userId,
        ])

        if (result.affectedRows === 0) {
            const err = new Error('刪除失敗，請洽管理人員')
            err.code = 500
            err.status = 'fail'
            throw err
        }

        console.log(
            `使用者 ${userAccount} 成功刪除地址: ${addressToDelete.city}${addressToDelete.district}${addressToDelete.address}`
        )

        res.status(200).json({
            status: 'success',
            data: {
                deletedAddress: {
                    id: addressToDelete.id,
                    city: addressToDelete.city,
                    district: addressToDelete.district,
                    address: addressToDelete.address,
                    recipient_name: addressToDelete.recipient_name,
                    was_default: Boolean(addressToDelete.is_default),
                },
                deletedAt: new Date().toISOString(),
                affectedRows: result.affectedRows,
                remainingAddresses: addressCount[0].count - 1,
            },
            message: '地址刪除成功',
        })
    } catch (error) {
        console.log('刪除地址錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '刪除地址失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// 設定預設地址
router.put('/:id/default', checkToken, async (req, res) => {
    try {
        const userId = req.decoded.id
        const userAccount = req.decoded.account
        const addressId = req.params.id

        // 檢查地址是否屬於當前用戶
        const [existingAddress] = await connection.execute(
            'SELECT id, city, district, address, is_default FROM users_addresses WHERE id = ? AND users_id = ?',
            [addressId, userId]
        )

        if (existingAddress.length === 0) {
            const err = new Error('地址不存在或無權限修改')
            err.code = 404
            err.status = 'fail'
            throw err
        }

        const targetAddress = existingAddress[0]

        // 如果已經是預設地址，直接返回成功
        if (targetAddress.is_default) {
            return res.status(200).json({
                status: 'success',
                data: {
                    addressId: addressId,
                    alreadyDefault: true,
                    address: `${targetAddress.city}${targetAddress.district}${targetAddress.address}`,
                },
                message: '該地址已經是預設地址',
            })
        }

        // 將所有地址設為非預設
        await connection.execute('UPDATE users_addresses SET is_default = 0 WHERE users_id = ?', [userId])

        // 將指定地址設為預設
        const [result] = await connection.execute(
            'UPDATE users_addresses SET is_default = 1, updated_at = NOW() WHERE id = ? AND users_id = ?',
            [addressId, userId]
        )

        if (result.affectedRows === 0) {
            const err = new Error('設定預設地址失敗')
            err.code = 500
            err.status = 'fail'
            throw err
        }

        console.log(
            `使用者 ${userAccount} 將地址 ${addressId} 設為預設: ${targetAddress.city}${targetAddress.district}${targetAddress.address}`
        )

        res.status(200).json({
            status: 'success',
            data: {
                addressId: addressId,
                address: `${targetAddress.city}${targetAddress.district}${targetAddress.address}`,
                updatedAt: new Date().toISOString(),
                affectedRows: result.affectedRows,
            },
            message: '預設地址設定成功',
        })
    } catch (error) {
        console.log('設定預設地址錯誤:', error)
        const statusCode = error.code ?? 500
        const statusText = error.status ?? 'error'
        const message = error.message ?? '設定預設地址失敗，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

export default router
