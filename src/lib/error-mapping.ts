export function getUserFriendlyErrorMessage(error: any): string {
    if (!error) return 'An unexpected error occurred.';

    // If it's a string, we still want to map it
    const message = typeof error === 'string' ? error : (error.message || '');

    if (!message) return 'An unexpected error occurred.';

    const normalizedMessage = message.toLowerCase();

    // Authentication & Authorization Errors
    if (normalizedMessage.includes('invalid login credentials') || normalizedMessage.includes('invalid login')) {
        return 'The email or password you entered is incorrect.';
    }
    if (normalizedMessage.includes('user already registered') || normalizedMessage.includes('already registered')) {
        return 'An account with this email already exists. Please sign in instead.';
    }
    if (normalizedMessage.includes('jwt expired') || normalizedMessage.includes('jwt payload does not validate')) {
        return 'Your session has expired. Please log in again.';
    }
    if (normalizedMessage.includes('permission denied') || normalizedMessage.includes('row-level security')) {
        return 'You do not have permission to perform this action. Please contact an administrator.';
    }

    // Database / Supabase Errors
    if (normalizedMessage.includes('duplicate key value violates unique constraint')) {
        return 'A record with this information already exists. Please check your inputs.';
    }
    if (normalizedMessage.includes('null value in column') || normalizedMessage.includes('violates not-null constraint')) {
        return 'Please fill in all required fields before saving.';
    }
    if (normalizedMessage.includes('foreign key constraint')) {
        return 'The selected reference data could not be found. It may have been deleted.';
    }
    if (normalizedMessage.includes('new row for relation')) {
        return 'Invalid data provided for the record. Please review your entries.';
    }

    // Network Errors
    if (normalizedMessage.includes('failed to fetch') || normalizedMessage.includes('network error')) {
        return 'Network error. Please check your internet connection and try again.';
    }

    // File Upload Errors
    if (normalizedMessage.includes('file size is too large')) {
        return 'The file size is too large. Please upload a smaller file.';
    }
    if (normalizedMessage.includes('invalid file format') || normalizedMessage.includes('mime type not supported')) {
        return 'This file format is not supported. Please upload a valid file type.';
    }

    // Let's add Fallback to original if we don't recognize it, but try to clean it up slightly
    // Many technical errors have codes or technical prefixes we can strip if needed.
    // But returning the original message is fine if not matched, or we can just fall back to a generic one
    // If we really want to make *all* errors understandable, we could return a generic one, 
    // but it's often useful to just show the original string if it doesn't match a technical one, because it might be a custom error.

    // If the message is very long or looks like a JSON stack trace, fall back to generic
    if (message.length > 150 && !message.includes(' ')) {
        return 'An unexpected system error occurred. Please try again.';
    }

    return message;
}
