import { ErrorCodes } from './errorCodes';

export function getReadableError(error: unknown): string {
    // Log original error for developers
    console.error('[UrbanBuild ErrorHandler]:', error);

    const errorString = (typeof error === 'string' ? error : (error as any)?.message || '');
    const lowerErrorString = errorString.toLowerCase();

    // Business Errors (using ErrorCodes)
    if (errorString === ErrorCodes.WORK_DUPLICATE_UBQN) {
        return "A work with this UBQN already exists. Please enter a different UBQN.";
    }
    if (errorString === ErrorCodes.QUOTATION_EXISTS) {
        return "A quotation has already been created for this work. You can edit the existing quotation instead.";
    }
    if (errorString === ErrorCodes.QUOTATION_REQUIRED) {
        return "Create and save the quotation before creating a forwarding letter.";
    }
    if (errorString === ErrorCodes.FORWARDING_REQUIRED) {
        return "Create the forwarding letter before generating an invoice.";
    }
    if (errorString === ErrorCodes.LINKED_RECORDS_EXIST) {
        return "This work cannot be deleted because it is linked to other records.";
    }
    if (errorString === ErrorCodes.SESSION_EXPIRED) {
        return "Your session has expired. Please sign in again.";
    }

    // Network Errors
    if (
        lowerErrorString.includes('failed to fetch') ||
        lowerErrorString.includes('network request failed') ||
        lowerErrorString.includes('err_connection')
    ) {
        return "Unable to connect to the server. Please check your internet connection and try again.";
    }

    // Permission Errors
    if (
        lowerErrorString.includes('403') ||
        lowerErrorString.includes('permission denied') ||
        lowerErrorString.includes('rls policy') ||
        errorString === ErrorCodes.PERMISSION_DENIED
    ) {
        return "You don't have permission to perform this action.";
    }

    // Duplicate Errors (Generic fallback for DB level uniqueness)
    if (
        lowerErrorString.includes('duplicate key') ||
        lowerErrorString.includes('unique constraint') ||
        lowerErrorString.includes('23505')
    ) {
        return "This record already exists. Please check the details and try again.";
    }

    // Validation Errors
    if (
        lowerErrorString.includes('null value violation') ||
        lowerErrorString.includes('invalid input syntax')
    ) {
        return "Please complete all required fields correctly.";
    }

    // Foreign Key Constraint Errors
    if (
        lowerErrorString.includes('foreign key constraint') ||
        lowerErrorString.includes('23503')
    ) {
        return "This work cannot be deleted because it is linked to other records.";
    }

    // Auth Errors
    if (lowerErrorString.includes('invalid login credentials')) {
        return "Invalid email or password.";
    }
    if (lowerErrorString.includes('email not confirmed')) {
        return "Please verify your email address before signing in. Check your inbox for the verification link.";
    }
    if (lowerErrorString.includes('user already registered')) {
        return "An account with this email already exists.";
    }
    if (lowerErrorString.includes('invalid email')) {
        return "Please enter a valid email address.";
    }

    // Fallback
    return "Something went wrong. Please try again later.";
}

