/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	LIKES: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const likesCount = await env.LIKES.get('likes_count');
		const requestUrl = new URL(request.url);
		const { hostname, pathname, search, hash } = requestUrl;

		if (pathname.includes('getLikes')) {
			const json = JSON.stringify({ status: 200, message: `count at ${new Date().getTime()}`, likesCount }, null, 2);
			return new Response(json, {
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		if (pathname.includes('incrementLikes')) {
			let updatedCount = parseInt(likesCount || '7') + 1;
			let status = 200;
			let message = `count updated at ${new Date().getTime()}`;
			try {
				await env.LIKES.put('likes_count', updatedCount.toFixed(0));
			} catch (error) {
				console.error('Error in incrementing likes', error);
				if (likesCount) {
					updatedCount = parseInt(likesCount);
				}
				status = 500;
				message = `failed to update count error: ${JSON.stringify(error)}`;
			}
			const json = JSON.stringify({ status, message, likesCount: updatedCount }, null, 2);
			return new Response(json, {
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		if (pathname.includes('decrementLikes')) {
			let updatedCount = parseInt(likesCount || '7') - 1;
			let status = 200;
			let message = `count updated at ${new Date().getTime()}`;
			if (updatedCount < 0) {
				updatedCount = 1;
			}
			try {
				await env.LIKES.put('likes_count', updatedCount.toFixed(0));
			} catch (error) {
				console.error('Error in decrementing likes', error);
				if (likesCount) {
					updatedCount = parseInt(likesCount);
				}
				status = 500;
				message = `failed to update count error: ${JSON.stringify(error)}`;
			}
			const json = JSON.stringify({ status, message, likesCount: updatedCount }, null, 2);
			return new Response(json, {
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		const json = JSON.stringify({ status: 404, message: `unknown/missing path` }, null, 2);
		return new Response(json, {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
				'Access-Control-Allow-Origin': '*',
			},
		});
	},
};
