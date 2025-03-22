import { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/:url',
    name: 'Outvision Group 集团厂商 作品更新',
    url: 'zh.wikipedia.org/wiki/CA集團',
    maintainers: ['trojanyao'],
    example: '/outvision-group/madonna-av.com_works_list_release',
    parameters: { url: '对应作品页的 URL 路径' },
    description: 'Outvision Group 集团厂商 作品更新',
    categories: ['multimedia'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    handler: async (ctx) => {
        let { url } = ctx.req.param();

        url = url.replaceAll('_', '/');

        const response = await ofetch(`https://${url}`);
        const $ = load(response);

        // Favicon
        const favicon = $('link[rel="shortcut icon"]').attr('href');

        const list: DataItem[] = $('body > main > section > div.p-search .item')
            .toArray()
            .map((item) => {
                const foundItem = $(item);

                const title = foundItem.find('div > a.img.hover > div > p').first().text();
                const link = foundItem.find('div > a.img.hover').first().attr('href');

                return {
                    title: title ?? '',
                    link: link ?? '',
                };
            });

        const items = await Promise.all(
            list.map((item) =>
                cache.tryGet(item.link ?? '', async () => {
                    const response = await ofetch(item.link ?? '');
                    const $ = load(response);

                    // Date
                    const releaseDateTh = $('div.th').filter((_index, th) => $(th).text().trim() === '発売日');
                    const releaseDateTd = releaseDateTh.next('div.td').text().trim();
                    const pubDate = releaseDateTd?.replace('年', '-')?.replace('月', '-')?.replace('日', '');
                    const pubDateHTML = `<p>【発売日】${releaseDateTd}</p>`;

                    // Actress
                    const actressTh = $('div.th').filter((_index, th) => $(th).text().trim() === '女優');
                    const actress = actressTh
                        .next('div.td')
                        .find('.item')
                        .toArray()
                        .map((act) => $(act).text().trim())
                        .join(' ');
                    const actressHTML = `<p>【女優】${actress}</p>`;

                    // Images
                    const headImgs = $('img.swiper-lazy')
                        .toArray()
                        .map((el) => $(el).attr('data-src'));

                    const imgs = headImgs.map((img) => `<img src="${img}" />`).join('');

                    item.pubDate = parseDate(pubDate) ?? null;
                    item.description = `${pubDateHTML}${actressHTML}${imgs}`;

                    return item;
                })
            )
        );
        const validItems = items.filter((i): i is DataItem => i !== null);

        return {
            // 源标题
            title: 'Outvision Group 集团厂商 作品更新',
            // 源链接
            link: `https://${url}`,
            description: 'Outvision Group 集团厂商 作品更新',
            logo: favicon,
            icon: favicon,
            language: 'ja',
            allowEmpty: true,
            item: validItems,
        };
    },
};
