declare const config: {
    runtime: string;
};
declare function export_default(req: any, res: any): Promise<Object>;

export { config, export_default as default };
