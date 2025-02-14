<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import Breadcrumbs from '$lib/components/Breadcrumbs.svelte';
	import MapLink from '$lib/components/ddnet/MapLink.svelte';
	import PlayerLink from '$lib/components/ddnet/PlayerLink.svelte';
	import FlagSpan from '$lib/components/FlagSpan.svelte';
	import TeeRender from '$lib/components/TeeRender.svelte';
	import { secondsToDate } from '$lib/date';
	import { mapType } from '$lib/ddnet/helpers';
	import { secondsToTime } from '$lib/helpers';
	import { encodeAsciiURIComponent } from '$lib/link.js';
	import { share } from '$lib/share';
	import { tippy } from '$lib/tippy';

	let { data } = $props();

	let explaination = $state(false);

	const hoursToColor = (value: number) => {
		const weight = value / 24;
		const h = Math.round((1.0 - weight) * 200);
		const s = Math.round(70 + weight * 30);
		const l = Math.round(40 + weight * 10);
		const a = Math.min(weight / 0.2, 1);
		return `hsl(${h}deg, ${s}%, ${l}%, ${a})`;
	};

	afterNavigate(() => {
		share({
			icon: `${window.location.origin}/shareicon.png`,
			link: `https://teeworlds.cn/goto#p${encodeAsciiURIComponent(data.player.player)}`,
			title: data.player.player,
			desc: `玩家信息：${data.player.points.points}pts`
		});
	});
</script>

<Breadcrumbs
	breadcrumbs={[
		{ href: '/', text: '首页', title: 'Teeworlds 中文社区' },
		{ href: '/ddnet', text: 'DDNet' },
		{ href: '/ddnet/players', text: '排名', title: 'DDNet 排名' },
		{ text: data.player.player, title: data.player.player }
	]}
/>

<div class="mb-4">
	<div class="flex flex-row items-center">
		<!-- increased max loss iter to make the color more accurate at least in player page -->
		<TeeRender
			url={data.skin.n}
			body={data.skin.b}
			feet={data.skin.f}
			useDefault
			className="w-16 h-16 -mb-1 -mt-1 mr-2"
			maxLossIter={10}
		></TeeRender>
		<div class="text-2xl font-bold">{data.player.player}</div>
	</div>
	<div class="text-md font-bold">
		<span>最近活跃：{secondsToDate(data.last_finish.timestamp)}</span>
	</div>
</div>
<div class="grid grid-cols-1 gap-4 md:grid-cols-1">
	<div class="rounded-lg bg-slate-700 p-4 shadow-md">
		<h2 class="mb-3 text-xl font-bold">
			玩家信息 <FlagSpan
				flag={data.player.favorite_server.server}
				tooltip="常玩地区：{data.player.favorite_server.server}"
			/>
			{#if data.player.pending_unknown || data.player.pending_points}
				<button
					class="cursor-pointer text-sm font-semibold text-blue-300 hover:text-blue-400"
					onclick={() => {
						explaination = !explaination;
					}}>ⓘ 数据不对？</button
				>
			{/if}
			{#if explaination}
				<span
					class="mt-2 block rounded-lg bg-slate-800 px-3 py-1 text-sm font-normal shadow-md md:float-right md:mt-0 md:inline-block"
					>分数统计结算有一天的延迟，部分数据可能需要48小时后才会出现</span
				>
			{/if}
		</h2>

		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
			{#each data.ranks as rank, i}
				<div
					class="rounded-lg bg-slate-600 px-3 py-1 shadow-md sm:py-3"
					class:opacity-50={!rank.rank.rank}
				>
					<h3 class="mb-1 text-base font-bold">{rank.name}</h3>
					{#if rank.rank.rank}
						<p class="text-md">
							<span class="text-sm">No.</span>{rank.rank.rank} - {rank.rank
								.points}pts{#if i == 0 && (rank.rank.pending || data.player.pending_unknown)}<span
									class="cursor-pointer font-semibold text-blue-300 hover:text-blue-400"
									use:tippy={{
										content: `根据最近过图记录，有${data.player.pending_unknown ? '至少' : ''}${
											rank.rank.pending || '?'
										}分尚未结算。${
											data.player.pending_unknown
												? '今日过图超过10次，数据可能不准确，请以明日结算结果为准。'
												: ''
										}`
									}}
									>{' '}+{rank.rank.pending}{#if data.player.pending_unknown}?{/if}</span
								>{/if}
						</p>
					{:else}
						<p class="text-md">未获得</p>
					{/if}
				</div>
			{/each}
		</div>

		<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
			<div class="mt-2 rounded-lg bg-slate-600 px-3 py-1 shadow-md sm:py-3">
				<h3 class="mb-1 text-base font-bold">🏁 最近完成</h3>
				{#each data.player.last_finishes as finish}
					<p class="text-md">
						<span class="text-sm">{secondsToDate(finish.timestamp)}</span>
						<FlagSpan flag={finish.country} />
						<MapLink map={finish.map} className="font-semibold"
							>[{mapType(finish.type)}] {finish.map}</MapLink
						> - {secondsToTime(finish.time)}
					</p>
				{/each}
			</div>

			<div
				class="mt-2 rounded-lg bg-slate-600 px-3 py-1 shadow-md sm:py-3"
				class:opacity-50={!data.player.favorite_partners.length}
			>
				<h3 class="mb-1 text-base font-bold">👍 常玩队友</h3>
				{#each data.player.favorite_partners as partner}
					<p class="text-md">
						<PlayerLink player={partner.name} className="font-semibold">{partner.name}</PlayerLink> -
						组队 {partner.finishes} 次
					</p>
				{/each}
				{#if !data.player.favorite_partners.length}
					<p class="text-md">暂无团队记录</p>
				{/if}
			</div>
		</div>
		{#if data.player.data_update_time}
			<div class="mt-2">
				上次数据更新于 {new Date(data.player.data_update_time * 1000).toLocaleString('zh-CN', {
					dateStyle: 'short',
					timeStyle: 'short'
				})}
			</div>
		{/if}
	</div>
	<div class="rounded-lg bg-slate-700 p-4 shadow-md">
		<h2 class="mb-3 text-xl font-bold">玩家数据</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 md:gap-2">
			{#each data.statsCols as col, i}
				<div>
					<div
						class="{i != 0 ? 'hidden md:grid' : ''} grid grid-cols-2 gap-2 text-center font-bold"
					>
						<div class="overflow-hidden text-center">分数</div>
						<div class="overflow-hidden text-center">完成度</div>
					</div>
					{#each col as stat}
						<div class="mt-1 rounded-lg bg-slate-600 px-1 py-0 md:mt-2 md:px-2 md:py-1">
							<div class="grid grid-cols-2 gap-2 px-2 text-sm md:text-base">
								<div class="overflow-hidden text-left">
									{stat.type == 'points' ? '总计' : mapType(stat.type)}
								</div>
								<div class="overflow-hidden text-right">
									{#if stat.rank}<span class="text-xs">NO.</span>{stat.rank}{/if}
								</div>
							</div>

							<div class="grid grid-cols-2 pb-1">
								<div
									class="h-full overflow-hidden rounded-l border-r-2 border-emerald-800 bg-emerald-900"
								>
									{#if stat.total_points}
										<p class="z-10 float-right mr-2 text-xs text-emerald-200 md:text-base">
											{Math.floor((stat.points / stat.total_points) * 100)}%
										</p>
										<p
											class="z-10 float-left ml-2 mt-0 text-right text-xs text-emerald-200 md:mt-1"
										>
											{#if stat.total_points}{stat.points}/{stat.total_points}{/if}
										</p>
										<div
											class="h-full {stat.points == stat.total_points
												? 'rounded-l'
												: 'rounded'} bg-emerald-600"
											style="width: {(stat.points / stat.total_points) * 100}%;"
										></div>
									{:else}
										<p class="z-10 float-right mr-2 text-xs text-emerald-200 md:text-base"></p>
										<p
											class="z-10 float-left ml-2 mt-0 text-right text-xs text-emerald-200 md:mt-1"
										></p>
										<div
											class="h-full {stat.finishes == stat.total_map
												? 'rounded-l'
												: 'rounded'} bg-emerald-600"
											style="width: {(stat.finishes / stat.total_map) * 100}%;"
										></div>
									{/if}
								</div>
								<div
									class="h-full border-collapse rounded-r border-l-2 border-teal-800 bg-teal-900"
								>
									<p class="z-10 float-left ml-2 text-right text-xs text-teal-200 md:text-base">
										{Math.floor((stat.finishes / stat.total_map) * 100)}%
									</p>
									<p class="z-10 float-right mr-2 mt-0 text-left text-xs text-teal-200 md:mt-1">
										{stat.finishes}/{stat.total_map}
									</p>
									<div
										class="h-full {stat.finishes == stat.total_map
											? 'rounded-r'
											: 'rounded'} bg-teal-600"
										style="margin-left: auto; width: {(stat.finishes / stat.total_map) * 100}%"
									></div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</div>
	<div class="rounded-lg bg-slate-700 p-4 shadow-md">
		<h2 class="mb-3 text-xl font-bold">玩家活跃</h2>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<div class="rounded-lg bg-slate-600 px-3 py-1 shadow-md sm:py-3">
				<h3 class="mb-1 text-base font-bold">首次记录</h3>
				<p>
					<MapLink map={data.player.first_finish.map} className="font-semibold"
						>{data.player.first_finish.map}</MapLink
					> ({secondsToTime(data.player.first_finish.time)})
				</p>
				<p>于 {secondsToDate(data.player.first_finish.timestamp)} 完成</p>
			</div>
			<div
				class="rounded-lg bg-slate-600 px-3 py-1 shadow-md sm:py-3"
				class:opacity-50={!data.player.hours_played_past_365_days}
			>
				<h3 class="mb-1 text-base font-bold">活跃时间</h3>
				{#if data.player.hours_played_past_365_days}
					<p>
						<span class="font-semibold">365天内游玩：</span>{data.player.hours_played_past_365_days}
						小时
					</p>
				{:else}
					<p>过去 365 天未游玩</p>
				{/if}
			</div>
		</div>
		<div class="mt-2 rounded-lg bg-slate-600 px-3 py-1 shadow-md sm:py-3">
			<h3 class="mb-1 text-base font-bold">活跃记录</h3>
			<div class="scrollbar-subtle mx-auto max-w-fit overflow-x-auto rounded bg-slate-700 p-3">
				<div class="flex flex-row flex-nowrap gap-2">
					<div class="flex flex-col text-sm">
						<p class="-mt-1 flex-grow text-nowrap">周一</p>
						<p class="text-nowrap">周日</p>
					</div>
					<div class="flex flex-col flex-nowrap gap-[0.125rem]">
						{#each data.activity as row, index}
							<div class="flex flex-row flex-nowrap gap-[0.125rem]">
								{#each row as col}
									{#if col.date}
										<div
											use:tippy={{ content: `${col.date} - ${col.hours} 小时` }}
											class="h-3 w-3 rounded-sm border border-slate-800"
											style="background-color: {hoursToColor(col.hours)}"
										></div>
									{:else}
										<div class=" h-3 w-3 border border-transparent"></div>
									{/if}
								{/each}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
