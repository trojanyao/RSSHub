import { DataItem, Route } from '@/types';
import { load } from 'cheerio';

import logger from '@/utils/logger';
import puppeteer from '@/utils/puppeteer';

export const route: Route = {
    path: '/:search',
    name: 'MGS動画',
    url: 'mgstage.com',
    maintainers: ['trojanyao'],
    example: '/mgstage/search_word=&series%5B%5D=人妻ランジェリーナ_0&sort=new&list_cnt=120&type=top',
    parameters: { search: '页面搜索参数,`cSearch.php?` 之后的部分' },
    description: 'MGS 動画作品更新',
    categories: ['multimedia'],
    features: {
        //     requireConfig: false,
        //     requirePuppeteer: false,
        //     antiCrawler: false,
        //     supportBT: false,
        //     supportPodcast: false,
        //     supportScihub: false,
    },
    radar: [
        {
            source: ['mgstage.com/:search'],
            target: '/:search',
        },
    ],
    handler: async (ctx) => {
        const { search } = ctx.req.param();

        const url = `https://www.mgstage.com/search/cSearch.php?${search}`;

        try {
            // 导入 puppeteer 工具类并初始化浏览器实例（启用 stealth 降低风控命中）
            const browser = await puppeteer({ stealth: true });
            // 打开一个新标签页
            const page = await browser.newPage();
            // 设置成年确认 Cookie，绕过年龄确认拦截
            await page.setCookie({
                name: 'adc',
                value: '1',
                domain: '.mgstage.com',
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax',
            });
            // 访问目标链接
            const link = url;
            // ofetch 请求会被自动记录，
            // 但 puppeteer 请求不会
            // 所以我们需要手动记录它们
            logger.http(`Requesting ${link}`);
            await page.goto(link, {
                // 指定页面等待载入的时间
                waitUntil: 'domcontentloaded',
            });
            // 获取页面的 HTML 内容
            const response = await page.content();
            // 关闭标签页
            page.close();

            const $ = load(response);

            // 标题
            const title = $('#center_column > ul > li:nth-child(7) > a').text().trim();

            // 文章列表
            const items: DataItem[] = $('.product_list_item')
                .toArray()
                .map((item) => {
                    const foundItem = $(item);

                    const a = foundItem.find('a.title');

                    let imageUrl: string = '';
                    const img = foundItem.find('h5 > a > img');
                    const src = img.attr('src');
                    if (src) {
                        // 替换 pf_o2 为 pb_e
                        imageUrl = src.replace('pf_o2', 'pb_e');
                    }

                    const previews = Array.from({ length: 20 })
                        .map((_, idx) => {
                            if (src) {
                                const capSrc = src.replace('pf_o2', `cap_e_${idx}`);
                                return `<img src="${capSrc}"/>`;
                            }
                            return '';
                        })
                        .join('');

                    return {
                        title: a.text().trim(),
                        link: new URL(a.attr('href')!, 'https://www.mgstage.com').href,
                        // pubDate: parseDate(foundItem?.find('div > ul > li.latest-release__headline')?.text()?.replace('年', '-')?.replace('月', '-')?.replace('日', '')),
                        author: foundItem.find('a.actor_name').text(),
                        description: `<img src="${imageUrl}"/>${previews}`,
                    };
                });

            // 不要忘记关闭浏览器实例
            await browser.close();

            return {
                title, // 源标题
                link: url, // 源链接
                description: `${title} 作品更新`,
                language: 'ja',
                item: items, // 文章列表
            };
        } catch (error) {
            logger.error(error);
            return null;
        }
    },
};
