/**
 * Sleep for a specified number of milliseconds.
 * @param ms Number of milliseconds to sleep
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
}; 