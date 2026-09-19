// List of supported email domains - only owned domains

export const DOMAINS = [
	{
		owner: "densat98",
		domain: "dst.my.id",
	},
	{
		owner: "densat98",
		domain: "ura.web.id",
	},
	{
		owner: "densat98",
		domain: "dnst.my.id",
	},
	{
		owner: "densat98",
		domain: "dlhptk.my.id",
	},
] satisfies {
	owner: string;
	domain: string;
}[];

export const DOMAINS_SET = new Set(DOMAINS.map((d) => d.domain));
