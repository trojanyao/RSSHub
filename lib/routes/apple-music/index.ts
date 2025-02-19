import { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/:name/:id',
    name: 'Apple Music',
    url: 'music.apple.com',
    maintainers: ['trojanyao'],
    example: '/apple-music/taylor-swift/159260351',
    parameters: { name: '音乐人名字（可在 AM 音乐人页面 URL 中找到）', id: '音乐人 ID（可在 AM 音乐人页面 URL 中找到）' },
    description: 'Apple Music 音乐人最新发布',
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
            source: ['music.apple.com/cn/artist/:name/:id'],
            target: '/:name/:id',
        },
    ],
    handler: async (ctx) => {
        const { name, id } = ctx.req.param();

        const response = await ofetch(`https://music.apple.com/cn/artist/${name}/${id}`);
        const $ = load(response);

        const items: DataItem[] = $('#scrollable-page > main > div > div.section.svelte-40si15.with-pinned-item > div.pinned-item > div.pinned-item-content')
            .toArray()
            .map((item) => {
                const foundItem = $(item);

                const a = foundItem.find('a').first();

                let imageUrl: string | undefined;
                const srcset = foundItem.find('picture > source:nth-child(2)').attr('srcset');
                if (srcset) {
                    const entries = srcset.split(',');
                    for (const entry of entries) {
                        const [url, width] = entry.trim().split(' ');
                        if (width === '316w') {
                            imageUrl = url;
                            break;
                        }
                    }
                }

                return {
                    title: a.text(),
                    link: a.attr('href'),
                    pubDate: parseDate(foundItem?.find('div > ul > li.latest-release__headline')?.text()?.replace('年', '-')?.replace('月', '-')?.replace('日', '')),
                    description: `<img src="${imageUrl}"/>
                    <p>${foundItem?.find('div > ul > li.latest-release__headline')?.text()}</p>
                    <p>${foundItem.find('li.latest-release__subtitle').text()}</p>`,
                    image: imageUrl,
                    banner: imageUrl,
                    content: {
                        html: `<img src="${imageUrl}" />`,
                        text: '',
                    },
                };
            });

        return {
            // 源标题
            title: `XXXX 最新发布`,
            // 源链接
            link: `https://music.apple.com/cn/artist/${name}/${id}`,
            description: 'Apple Music 音乐人 最新发布',
            logo: 'https://music.apple.com/assets/favicon/favicon-180.png',
            icon: 'https://music.apple.com/assets/favicon/favicon-180.png',
            language: 'zh-CN',
            // 源文章
            item: items,
        };
    },
};
