import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MoreHorizontal,
    ShieldAlert,
    Search,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getUserFriendlyErrorMessage } from '@/lib/error-mapping';

// Define the shape of our data based on the SQL View
interface UserData {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
    last_sign_in_at: string | null;
    created_at: string;
}

const AVAILABLE_ROLES = [
    'Director',
    'Assistant Director',
    'Admin',
    'Co-ordinator',
    'Junior Engineer'
];

// Maps the clean UI display names to the underlying Postgres ENUM values
const DB_ROLE_MAP: Record<string, string> = {
    'Director': 'Director',
    'Assistant Director': 'Assistant Director',
    'Admin': 'Admin',
    'Co-ordinator': 'Co-ordinator',
    'Junior Engineer': 'Junior Engineer',
    'Junior engineer': 'Junior Engineer',
    'Pending': 'Pending'
};

export function UserManagement() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();
    const { role: currentUserRole } = useAuth(); // We check the viewer's role

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase as any)
                .from('user_management_view')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const formattedData = (data as any[] || []).map(u => ({
                ...u,
                role: u.role_raw || u.role
            }));
            setUsers(formattedData as unknown as UserData[]);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            toast({
                title: "Access Denied",
                description: "You do not have permission to view user data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            console.log("=== ROLE CHANGE DEBUG ===");
            console.log("1. Raw newRole from UI:", `"${newRole}"`);
            const dbRole = DB_ROLE_MAP[newRole] || newRole; // Fallback to raw string just in case
            console.log("2. Mapped dbRole for DB:", `"${dbRole}"`);

            // 1. Update the role in the database using the raw mapped enum
            const { data, error } = await supabase
                .from('user_roles')
                .update({ role: dbRole } as any) // Need to bypass the interface completely
                .eq('user_id', userId)
                .select();

            console.log("3. Supabase Response:", { data, error });

            if (error) {
                console.error("Supabase Error Object:", JSON.stringify(error, null, 2));
                throw error;
            }

            // 2. Optimistically update the UI (so we don't need to fetch again)
            setUsers(users.map(u =>
                u.user_id === userId ? { ...u, role: newRole } : u
            ));

            toast({
                title: "Role Updated",
                description: `User is now a ${newRole}`,
            });
        } catch (error: any) {
            console.error("4. Catch Block Error:", JSON.stringify(error, null, 2));
            toast({
                title: "Update Failed",
                description: getUserFriendlyErrorMessage(error),
                variant: "destructive"
            });
        }
    };

    // Filter users based on search
    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Security Check: Even though the page is protected, we double-check here
    if (currentUserRole !== 'Director') {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 text-destructive" />
                <h3 className="text-lg font-semibold">Authorized Personnel Only</h3>
                <p className="text-muted-foreground">Only Directors can manage user roles.</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-0"
        >
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                        {loading ? 'Loading...' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`}
                    </span>
                    {searchTerm && !loading && (
                        <Badge variant="secondary" className="text-xs">
                            filtered
                        </Badge>
                    )}
                </div>
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 bg-background border-border/60 focus-visible:ring-primary/20"
                    />
                </div>
            </div>

            {/* Table Section */}
            <div>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pl-5">User</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Current Role</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wider text-muted-foreground">Last Active</TableHead>
                            <TableHead className="text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground pr-5">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    <TableCell className="flex items-center gap-3 pl-5">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[120px]" />
                                            <Skeleton className="h-3 w-[160px]" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell className="text-right pr-5"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Search className="h-8 w-8 text-muted-foreground/40" />
                                        <p className="text-muted-foreground text-sm">No users found matching "{searchTerm}"</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.user_id} className="hover:bg-muted/30 transition-colors">
                                    {/* User Info Column */}
                                    <TableCell className="flex items-center gap-3 pl-5 py-4">
                                        <Avatar className="h-10 w-10 border border-border/50">
                                            <AvatarImage src={user.avatar_url || ''} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                                {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm text-foreground">{user.full_name || 'Unnamed User'}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>

                                    {/* Role Badge Column */}
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={`
                                                ${user.role === 'Director' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : ''}
                                                ${user.role === 'Junior Engineer' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100' : ''}
                                                ${user.role === 'Admin' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
                                                ${user.role === 'Co-ordinator' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : ''}
                                                ${user.role === 'Assistant Director' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}
                                            `}
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>

                                    {/* Dates Columns */}
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                                        {user.last_sign_in_at
                                            ? new Date(user.last_sign_in_at).toLocaleDateString()
                                            : 'Never'}
                                    </TableCell>

                                    {/* Actions Column */}
                                    <TableCell className="text-right pr-5">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Manage Access</DropdownMenuLabel>
                                                <DropdownMenuSeparator />

                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                                        Change Role
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuRadioGroup
                                                            value={user.role}
                                                            onValueChange={(val) => handleRoleChange(user.user_id, val)}
                                                        >
                                                            {AVAILABLE_ROLES.map((role) => (
                                                                <DropdownMenuRadioItem key={role} value={role}>
                                                                    {role}
                                                                </DropdownMenuRadioItem>
                                                            ))}
                                                        </DropdownMenuRadioGroup>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>

                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                    Revoke Access (Manual)
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </motion.div>
    );
}