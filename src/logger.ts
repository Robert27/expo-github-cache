/**
 * Logger for Expo GitHub Cache
 *
 * @fileOverview Provides a modern logging interface with spinners and colored output
 * @module logger
 */
import chalk from "chalk";
import figures from "figures";
import logSymbols from "log-symbols";
import ora from "ora";

/**
 * A modern logger for Expo GitHub Cache
 * Provides beautiful console output with spinners and icons
 */
export class Logger {
	private spinner = ora();

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
}

export const logger = new Logger();
