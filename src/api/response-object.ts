export class ResponseObject<T> {
    statusCode: number;
    message: string;
    data?: T | null;
    totalRecords?: number | null;
    totalPages?: number | null;
    currentPage?: number | null;
    isLast?: boolean | null;

    constructor(
        statusCode: number,
        message: string,
        data?: T | null,
        totalRecords?: number | null,
        totalPages?: number | null,
        currentPage?: number | null,
        isLast?: boolean | null
    ) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data ?? null;
        this.totalRecords = totalRecords ?? null;
        this.totalPages = totalPages ?? null;
        this.currentPage = currentPage ?? null;
        this.isLast = isLast ?? null;
    }

    get success(): boolean {
        return this.statusCode >= 200 && this.statusCode < 300;
    }

    static create<T>(base: ResponseObject<any>, mappedData: T): ResponseObject<T> {
        return new ResponseObject<T>(
            base.statusCode,
            base.message,
            mappedData,
            base.totalRecords,
            base.totalPages,
            base.currentPage,
            base.isLast
        );
    }

    static fromObject<T>(data: any): ResponseObject<T> {
        return new ResponseObject<T>(
            data.statusCode || 0,
            data.message || '',
            data.data || null,
            data.totalRecords || null,
            data.totalPages || null,
            data.currentPage || null,
            data.isLast ?? null
        );
    }
}