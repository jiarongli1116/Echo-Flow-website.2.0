'use client'

import React, { useState, useEffect } from 'react'
import TaiwanMap from './twmap'
import styles from '../page.module.css'

export default function Map({ shop, getCity }) {
    const [city, setCity] = useState('TWTPE')

    const cityData = [
        {
            city: '台北市',
            code: 'TWTPE',
        },
        {
            city: '新北市',
            code: 'TWNWT',
        },
        {
            city: '基隆市',
            code: 'TWKEE',
        },
        {
            city: '桃園市',
            code: 'TWTAO',
        },
        {
            city: '新竹縣',
            code: 'TWHSQ',
        },
        {
            city: '台中市',
            code: 'TWTXG',
        },
        {
            city: '台南市',
            code: 'TWTNN',
        },
        {
            city: '高雄市',
            code: 'TWKHH',
        },
        {
            city: '屏東縣',
            code: 'TWPIF',
        },
    ]

    const counties = [
        {
            name: '台北市',
            data: 'TWTPE',
        },
        {
            name: '新北市',
            data: 'TWNWT',
        },
        {
            name: '基隆市',
            data: 'TWKEE',
        },
        {
            name: '桃園市',
            data: 'TWTAO',
        },
        {
            name: '新竹市',
            data: 'TWHSZ',
        },
        {
            name: '新竹縣',
            data: 'TWHSQ',
        },
        {
            name: '苗栗縣',
            data: 'TWMIA',
        },
        {
            name: '台中市',
            data: 'TWTXG',
        },
        {
            name: '彰化縣',
            data: 'TWCHA',
        },
        {
            name: '南投縣',
            data: 'TWNAN',
        },
        {
            name: '雲林縣',
            data: 'TWYUN',
        },
        {
            name: '嘉義市',
            data: 'TWCYI',
        },
        {
            name: '嘉義縣',
            data: 'TWCYQ',
        },
        {
            name: '台南市',
            data: 'TWTNN',
        },
        {
            name: '高雄市',
            data: 'TWKHH',
        },
        {
            name: '屏東縣',
            data: 'TWPIF',
        },
        {
            name: '宜蘭縣',
            data: 'TWILA',
        },
        {
            name: '花蓮縣',
            data: 'TWHUA',
        },
        {
            name: '台東縣',
            data: 'TWTTT',
        },
    ]

    useEffect(() => {
        getCity(city)
    }, [city])

    const currentCityData = counties.find((item) => item.data === city)
    const currentCityIndex = cityData.findIndex((item) => item.code === city)

    function getUp(e) {
        const newIndex = (currentCityIndex + 1) % cityData.length
        setCity(cityData[newIndex].code)
    }

    function getDown(e) {
        const newIndex =
            (currentCityIndex - 1 + cityData.length) % cityData.length
        setCity(cityData[newIndex].code)
    }

    return (
        <>
            <section
                className={`${styles.onMap} ${styles.bgBlack900} ${styles.alc}`}
            >
                <div className="container d-flex">
                    <div className={styles.left}>
                        <div className={styles.title}>
                            <p className="text-light mb-0">門市搜尋</p>
                            <h2 className={`${styles.gold600} me-auto`}>
                                HOW TO FIND US
                            </h2>
                        </div>
                        <div className={styles.shopsInf}>
                            <div className={styles.shopBar}>
                                <h6
                                    className={`${styles.shopPlace} text-light ${styles.bgGold600} ${styles.alc}`}
                                >
                                    {currentCityData
                                        ? `${currentCityData.name} ${currentCityData.data}`
                                        : ''}
                                </h6>
                                <div
                                    className={`${styles.shopBtn} ${styles.alc}`}
                                >
                                    <div
                                        className={`${styles.Btn}`}
                                        onClick={() => getDown()}
                                    >
                                        <i className="fa-solid fa-arrow-left"></i>
                                    </div>
                                    <div
                                        className={`${styles.Btn}`}
                                        onClick={() => getUp()}
                                    >
                                        <i className="fa-solid fa-arrow-right"></i>
                                    </div>
                                </div>
                            </div>

                            {shop.length > 0 ? (
                                <div className={styles.shops}>
                                    {shop.map((e, i) => {
                                        return (
                                            <div
                                                className={styles.shop}
                                                key={i}
                                            >
                                                <h6>{e.name}</h6>
                                                <div className={styles.content}>
                                                    <p>
                                                        <i className="fa-solid fa-phone-volume"></i>
                                                        &nbsp;電話 {e.phone}
                                                    </p>
                                                    <p>
                                                        <i className="fa-solid fa-location-dot"></i>
                                                        &nbsp;地址 {e.place}
                                                    </p>
                                                </div>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                        e.place
                                                    )}`}
                                                    target="_blank"
                                                    className={styles.link}
                                                >
                                                    <i className="fa-solid fa-circle-plus"></i>
                                                    &nbsp;前往門市
                                                </a>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div
                                    className={`${styles.alc} ${styles.noData}`}
                                >
                                    <h1>沒有此縣市資料</h1>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className={`${styles.tw} d-xxl-flex d-none`}>
                        <TaiwanMap setCity={setCity} city={city} />
                    </div>
                </div>
            </section>
        </>
    )
}
