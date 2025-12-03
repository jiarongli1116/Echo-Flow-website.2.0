import express from 'express'
import multer from 'multer'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import connection from '../connect.js'

const upload = multer()
const secretKey = process.env.JWT_SECRET_KEY
const router = express.Router()

// > 首頁輪播圖片
router.get('/header', async (req, res) => {
    try {
        const sql = `SELECT 
                v.id,
                v.name, 
                v.image_id, 
                i.pathname
            FROM 
                vinyl AS v
            INNER JOIN 
                vinyl_images AS i ON v.id = i.vinyl_id
            WHERE i.pathname IS NOT NULL AND i.pathname != ''
            AND v.is_valid = 1
            ORDER BY 
                RAND()
            LIMIT 
                40;`

        // 一次性執行查詢，獲取 40 張隨機唱片
        let [allVinyls] = await connection.execute(sql)

        // 將結果分割成兩組，每組 20 張
        const vinyl1 = allVinyls.slice(0, 20)
        const vinyl2 = allVinyls.slice(20, 40)

        console.log(`共 ${vinyl1.length},${vinyl2.length} 張隨機唱片`)

        res.status(200).json({
            status: 'success',
            data: {
                vinyl1: vinyl1,
                vinyl2: vinyl2,
            },
            message: `共 ${vinyl1.length},${vinyl2.length} 張隨機唱片`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// > 首頁種類
router.get('/class', async (req, res) => {
    try {
        const targetValues = [1, 2, 3, 4, 5]
        const promises = targetValues.map((value) => {
            const sql = `SELECT 
                            v.id,
                            v.name, 
                            v.image_id, 
                            v.main_category_id,
                            c.title,
                            i.pathname
                        FROM 
                            vinyl AS v
                        JOIN 
                            vinyl_images AS i ON v.id = i.vinyl_id
                        JOIN 
                            main_category AS c ON c.id = v.main_category_id
                        WHERE 
                            v.main_category_id = ?
                        AND i.pathname IS NOT NULL AND i.pathname != ''
                        ORDER BY 
                            RAND()
                        LIMIT 
                            1;`
            return connection.execute(sql, [value])
        })

        const results = await Promise.all(promises)

        const vinyls = results.map((result) => result[0][0])

        console.log(`共 ${vinyls.length} 張隨機唱片`)

        res.status(200).json({
            status: 'success',
            data: {
                vinyls: vinyls,
            },
            message: `共 ${vinyls.length} 張隨機唱片`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// > 首頁特價推薦
router.get('/sale', async (req, res) => {
    try {
        const userId = req.query.id || null

        const sql = `SELECT
                        v.id,
                        v.name,
                        v.price,
                        v.artist,
                        v.image_id,
                        i.pathname,
                        COUNT(vb_all.vinyl_id) AS bookmark_count,
                        CASE WHEN MAX(vb_user.users_id) IS NOT NULL THEN 1 ELSE 0 END AS has_bookmarked
                    FROM
                        vinyl AS v
                    JOIN
                        vinyl_images AS i ON v.image_id = i.id
                    LEFT JOIN
                        vinyl_bookmarks AS vb_all ON v.id = vb_all.vinyl_id
                    LEFT JOIN
                        vinyl_bookmarks AS vb_user ON v.id = vb_user.vinyl_id AND vb_user.users_id = ?
                    WHERE
                        v.stock > 0
                    AND v.is_valid = 1
                    AND i.pathname IS NOT NULL AND i.pathname != ''
                    GROUP BY
                        v.id, v.name, v.price, v.artist, v.image_id, i.pathname
                    ORDER BY
                        bookmark_count DESC
                    LIMIT 20;`
        let [sale] = await connection.execute(sql, [userId])

        const sql2 = `SELECT
                        v.id,
                        v.name,
                        v.price,
                        v.artist,
                        v.image_id,
                        i.pathname,
                        CASE WHEN vb_user.users_id IS NOT NULL THEN 1 ELSE 0 END AS has_bookmarked
                    FROM
                        vinyl AS v
                    JOIN
                        vinyl_images AS i ON v.image_id = i.id
                    LEFT JOIN
                        vinyl_bookmarks AS vb_user ON v.id = vb_user.vinyl_id AND vb_user.users_id = ?
                    WHERE
                        v.stock > 0
                    AND v.is_valid = 1
                    AND i.pathname IS NOT NULL AND i.pathname != ''
                    ORDER BY 
                        RAND()
                    LIMIT 
                        20;`
        let [recommend] = await connection.execute(sql2, [userId])

        console.log(
            `共 ${sale.length} 張特價唱片 與 ${recommend.length} 張推薦唱片`
        )

        res.status(200).json({
            status: 'success',
            data: { sale: sale, recommend: recommend },
            message: `共 ${sale.length} 張特價唱片 與 ${recommend.length} 張推薦唱片`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// > 首頁論壇
router.get('/news', async (req, res) => {
    try {
        const type = req.query.type || '1'

        let whereConditions = []
        let queryParams = []
        let orderByClause = `p.created_at DESC`

        if (type === '2') {
            orderByClause = `(p.view_count * 1) + (p.like_count * 5) + (p.comment_count * 10) + (p.bookmark_count * 15) DESC`
        } else if (type !== '1') {
            whereConditions.push('p.category_id = ?')
            queryParams.push(type)
        }

        whereConditions.push('p.is_deleted = 1')

        const whereClause =
            whereConditions.length > 0
                ? ` WHERE ${whereConditions.join(' AND ')}`
                : ''

        const sql = `SELECT
                        p.id,
                        p.title,
                        u.nickname,
                        p.content,
                        p.view_count,
                        p.like_count,
                        p.comment_count,
                        p.category_id,
                        c.name as category,
                        pi.image_url,
                        GROUP_CONCAT(t.name) AS tags
                    FROM
                        posts AS p
                    JOIN
                        users AS u ON p.users_id = u.id
                    JOIN
                        categories AS c ON p.category_id = c.id
                    LEFT JOIN
                        post_images AS pi ON pi.post_id = p.id AND pi.sort_order = (
                            SELECT MIN(sort_order)
                            FROM post_images
                            WHERE post_id = p.id
                            AND is_deleted = 1
                        )
                    LEFT JOIN
                        post_tags AS pt ON pt.post_id = p.id
                    LEFT JOIN
                        tags AS t ON t.id = pt.tag_id
                    ${whereClause}
                    GROUP BY
                        p.id
                    ORDER BY
                        ${orderByClause}
                    LIMIT 3;`

        let [news] = await connection.execute(sql, queryParams)

        console.log(`共 ${news.length} 篇文章`)

        res.status(200).json({
            status: 'success',
            data: news,
            message: `共 ${news.length} 篇文章`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// > 首頁排行推薦
router.get('/rank', async (req, res) => {
    try {
        const userId = req.query.id || null

        console.log(userId)

        const sql = `SELECT
                        v.id,
                        v.name,
                        v.artist,
                        v.image_id,
                        i.pathname,
                        COUNT(vr.vinyl_id) AS review_count,
                        AVG(vr.rating) AS average_rating,
                        v.spotify_album_id,
                        CASE WHEN MAX(vb_user.users_id) IS NOT NULL THEN 1 ELSE 0 END AS has_bookmarked
                    FROM
                        vinyl AS v
                    JOIN
                        vinyl_images AS i ON v.image_id = i.id
                    LEFT JOIN
                        vinyl_review AS vr ON v.id = vr.vinyl_id
                    LEFT JOIN
                        vinyl_bookmarks AS vb_user ON v.id = vb_user.vinyl_id AND vb_user.users_id = ?
                    WHERE i.pathname IS NOT NULL AND i.pathname != ''
                    AND
                        v.stock > 0
                    GROUP BY
                        v.id, v.name, v.artist, v.image_id, i.pathname
                    ORDER BY
                        average_rating DESC, v.created_at DESC
                    LIMIT 20;`
        let [rank] = await connection.execute(sql, [userId])

        console.log(`共 ${rank.length} 張排名唱片`)

        res.status(200).json({
            status: 'success',
            data: rank,
            message: `共 ${rank.length} 張排名唱片`,
        })
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

// > 首頁商店
router.get('/shop', async (req, res) => {
    try {
        const city = req.query.city || 'TWTPE'

        let whereConditions = []
        let queryParams = []

        // ! 缺少 like & comments
        if (city) {
            whereConditions.push('WHERE s.city = ?')
            queryParams.push(city)
        }

        const sql = `SELECT
                       *
                    FROM
                        vinyl_shops AS s
                    ${whereConditions};`

        let [result] = await connection.execute(sql, queryParams)

        if (result.length > 0) {
            console.log(`${result[0].city} 共 ${result.length} 間商店`)
            res.status(200).json({
                status: 'success',
                data: result,
                message: `${result[0].city} 共 ${result.length} 間商店`,
            })
        } else {
            // 如果 result 陣列為空，回傳成功但資料為空的訊息
            console.log(`找不到 ${city} 的商店`)
            res.status(200).json({
                status: 'success',
                data: [],
                message: `找不到 ${city} 的商店`,
            })
        }
    } catch (error) {
        // 補獲錯誤
        console.log(error)
        const statusCode = error.code ?? 401
        const statusText = error.status ?? 'error'
        const message = error.message ?? '身份驗證錯誤，請洽管理人員'
        res.status(statusCode).json({
            status: statusText,
            message,
        })
    }
})

export default router
