export const enum Fps {
    F23p976 = 0,
    F23p976DF,
    F24,
    F25,
    F29p997,
    F29p997DF,
    F30,
}

export interface TimecodeFlags {
    dropframe: boolean,
}

export class Timecode {
    constructor (parts: Iterable<number, number> | ArrayLike<number>, fps: Fps, flags?: TimecodeFlags) {
        if (flags) {
            this.flags = flags;
        }

        if (fps) {
            this.fps = fps;
        }

        if (parts) {
            if (this.flags.dropframe) {
                console.warn("not implemented");
            }

            this.parts = Array.from(parts);
        }
    }

    static fromString(tcString: string, fps: Fps): Timecode | null {
        if (!/\d\d:\d\d:\d\d(:|;)\d\d/.test(tcString)) {
            return null;
        }

        let parts: Array<string> = tcString
            .split(Timecode.DELIMITER);

        if (tcString.search(Timecode.DELIMITER_DF) !== -1) {
            parts = [
                parts[Timecode.HRS_INDEX],
                parts[Timecode.MINS_INDEX],
                ...parts[Timecode.SECS_INDEX].split(Timecode.DELIMITER_DF),
            ];
        }

        return new Timecode(parts.map(n => parseInt(n)), fps);
    }

    toString(): string {
        const tcFrontPart = this.parts
            .map(part => part.toString().padStart(2, "0"))
            .slice(0, Timecode.FRAMES_INDEX)
            .join(Timecode.DELIMITER);

        const tcBackPart = this.parts[Timecode.FRAMES_INDEX]
            .toString()
            .padStart(2, "0");

        return (this.flags.dropframe)
            ? `${tcFrontPart}${Timecode.DELIMITER_DF}${tcBackPart}`
            : `${tcFrontPart}${Timecode.DELIMITER}${tcBackPart}`;
    }

    get hrs(): number {
        return this.parts[Timecode.HRS_INDEX];
    }

    get mins(): number {
        return this.parts[Timecode.MINS_INDEX];
    }

    get secs(): number {
        return this.parts[Timecode.SECS_INDEX];
    }

    get frames(): number {
        return this.parts[Timecode.FRAMES_INDEX];
    }

    set hrs(hrs: number) {
        this.parts[Timecode.HRS_INDEX] = hrs;
    }

    set mins(mins: number) {
        this.parts[Timecode.MINS_INDEX] = mins;
    }

    set secs(secs: number) {
        this.parts[Timecode.SECS_INDEX] = secs;
    }

    set frames(frames: number) {
        this.parts[Timecode.FRAMES_INDEX] = frames;
    }

    get hmsf(): Array<number> {
        return this.parts;
    }

    set hmsf(parts: Iterable<number> | ArrayLike<number>) {
        this.parts = Array.from(parts);
    }

    static readonly DELIMITER = ":";
    static readonly DELIMITER_DF = ";";

    static readonly HRS_INDEX = 0;
    static readonly SECS_INDEX = 1;
    static readonly MINS_INDEX = 2;
    static readonly FRAMES_INDEX = 3;

    static readonly TOTAL_PARTS = 4;
    static readonly TOTAL_GROUP_COLUMNS = 3;
    static readonly FRAMES_DELIMITER_INDEX = 8;

    fps: Fps = $state(Fps.F25);
    parts: Array<number> = $state([0, 0, 0, 0]);
    flags: TimecodeFlags = $state({ dropframe: false });
}
