/**
 * Logger for Expo GitHub Cache
 *
 * @fileOverview Provides a modern logging interface with spinners, progress bars, and colored output
 * @module logger
 */
import chalk from "chalk";
import * as cliProgress from "cli-progress";
import figures from "figures";
import logSymbols from "log-symbols";
import ora from "ora";

/**
 * A modern logger for Expo GitHub Cache
 * Provides beautiful console output with spinners, progress bars and icons
 */
export class Logger {
	private spinner = ora();
	private progressBar = new cliProgress.SingleBar({
		format: `${chalk.cyan("{bar}")} ${chalk.cyan("{percentage}%")} | {value}/{total} | {status}`,
		barCompleteChar: "\u2588",
		barIncompleteChar: "\u2591",
		hideCursor: true,
	});

	/**
	 * Log an informational message
	 */
	info(message: string): void {
		console.log(`${chalk.blue(figures.info)} ${message}`);
	}

	/**
	 * Log a success message
	 */
	success(message: string): void {
		console.log(`${logSymbols.success} ${chalk.green(message)}`);
	}

	/**
	 * Log an error message
	 */
	error(message: string, error?: unknown): void {
		console.error(`${logSymbols.error} ${chalk.red(message)}`);
		if (error instanceof Error) {
			console.error(chalk.red(`  └─ ${error.message}`));
		} else if (error !== undefined) {
			console.error(chalk.red(`  └─ ${String(error)}`));
		}
	}

	/**
	 * Log a warning message
	 */
	warn(message: string): void {
		console.warn(`${logSymbols.warning} ${chalk.yellow(message)}`);
	}

	/**
	 * Start a spinner with the given message
	 */
	startSpinner(message: string): void {
		this.spinner.start(message);
	}

	/**
	 * Update the spinner message
	 */
	updateSpinner(message: string): void {
		this.spinner.text = message;
	}

	/**
	 * Stop the spinner with a success message
	 */
	succeedSpinner(message: string): void {
		this.spinner.succeed(chalk.green(message));
	}

	/**
	 * Stop the spinner with an error message
	 */
	failSpinner(message: string): void {
		this.spinner.fail(chalk.red(message));
	}

	/**
	 * Start a progress bar with the given total and initial status
	 */
	startProgress(total: number, status = "Starting"): void {
		this.progressBar.start(total, 0, { status });
	}

	/**
	 * Update the progress bar
	 */
	updateProgress(value: number, status?: string): void {
		if (status) {
			this.progressBar.update(value, { status });
		} else {
			this.progressBar.update(value);
		}
	}

	/**
	 * Stop the progress bar
	 */
	stopProgress(): void {
		this.progressBar.stop();
	}
}

export const logger = new Logger();
