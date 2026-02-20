import { redirect } from "@sveltejs/kit";
import { SESSION_COOKIE } from "$lib/server/auth/session-cookie.js";

export const prerender = false;

export function GET({ cookies }) {
	cookies.delete(SESSION_COOKIE, { path: "/" });
	throw redirect(302, "/");
}
