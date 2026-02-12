import { useEffect, useState } from 'react';
import {
    MoreHorizontal,
    ShieldAlert,
    CheckCircle2,
    Search,
    Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
    'Employee'
];

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
            setUsers((data as unknown as UserData[]) || []);
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
            // 1. Update the role in the database
            const { error } = await supabase
                .from('user_roles')
                .update({ role: newRole } as any)
                .eq('user_id', userId);

            if (error) throw error;

            // 2. Optimistically update the UI (so we don't need to fetch again)
            setUsers(users.map(u =>
                u.user_id === userId ? { ...u, role: newRole } : u
            ));

            toast({
                title: "Role Updated",
                description: `User is now a ${newRole}`,
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
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
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                    <p className="text-muted-foreground">
                        Manage roles and access for your Google-authenticated users.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* Table Section */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead>User</TableHead>
                            <TableHead>Current Role</TableHead>
                            <TableHead className="hidden md:table-cell">Joined</TableHead>
                            <TableHead className="hidden md:table-cell">Last Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Loading users...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No users found matching "{searchTerm}"
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.user_id}>
                                    {/* User Info Column */}
                                    <TableCell className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={user.avatar_url || ''} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.full_name || 'Unnamed User'}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>

                                    {/* Role Badge Column */}
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={`
                        ${user.role === 'Director' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : ''}
                        ${user.role === 'Employee' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100' : ''}
                        ${user.role === 'Admin' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
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
                                    <TableCell className="text-right">
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
        </div>
    );
}