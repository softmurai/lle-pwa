/// <reference path="../.astro/types.d.ts" />

declare namespace App {
	interface Locals {
		admin?: {
			username: string;
			role: 'admin' | 'referee';
		};
	}
}
