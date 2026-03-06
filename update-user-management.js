const fs = require('fs');

const path = 'src/components/settings/UserManagement.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
`import { useEffect, useState } from 'react';
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
import { useAuth } from '@/hooks/useAuth';`,
`import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MoreHorizontal,
    ShieldAlert,
    Search,
    Loader2
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
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';`
);

content = content.replace(
`            if (error) throw error;
            setUsers((data as unknown as UserData[]) || []);`,
`            if (error) throw error;
            const formattedData = (data as any[] || []).map(u => ({
                ...u,
                role: u.role_raw || u.role
            }));
            setUsers(formattedData as unknown as UserData[]);`
);

content = content.replace(
`    return (
        <div className="space-y-6">
            {/* Header Section */}`,
`    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
        >
            {/* Header Section */}`
);

content = content.replace(
`        </div>
    );
}`,
`        </motion.div>
    );
}`
);

const skeletonHTML = `                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={\`skeleton-\${i}\`}>
                                    <TableCell className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-[120px]" />
                                            <Skeleton className="h-3 w-[160px]" />
                                        </div>
                                    </TableCell>
                                    <TableCell><Skeleton className="h-8 w-[120px] rounded-md" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                                </TableRow>
                            ))`;
content = content.replace(
`                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Loading users...
                                    </div>
                                </TableCell>
                            </TableRow>`,
skeletonHTML
);

content = content.replace(
`                                    {/* Role Badge Column */}
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className={\`
                        \${user.role === 'Director' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : ''}
                        \${user.role === 'Employee' ? 'bg-slate-100 text-slate-700 hover:bg-slate-100' : ''}
                        \${user.role === 'Admin' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : ''}
                      \`}
                                        >
                                            {user.role}
                                        </Badge>
                                    </TableCell>

                                    {/* Dates Columns */}`,
`                                    {/* Role Select Column */}
                                    <TableCell>
                                        <Select
                                            value={user.role}
                                            onValueChange={(val) => handleRoleChange(user.user_id, val)}
                                        >
                                            <SelectTrigger className={\`w-[150px] h-8 text-xs font-medium border-0 focus:ring-1 focus:ring-ring
                                                \${user.role === 'Director' ? 'bg-purple-100/60 text-purple-700 hover:bg-purple-100/80 data-[state=open]:bg-purple-100/80' : ''}
                                                \${user.role === 'Employee' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 data-[state=open]:bg-slate-200' : ''}
                                                \${user.role === 'Admin' ? 'bg-blue-100/60 text-blue-700 hover:bg-blue-100/80 data-[state=open]:bg-blue-100/80' : ''}
                                                \${user.role === 'Co-ordinator' ? 'bg-amber-100/60 text-amber-700 hover:bg-amber-100/80 data-[state=open]:bg-amber-100/80' : ''}
                                                \${user.role === 'Assistant Director' ? 'bg-emerald-100/60 text-emerald-700 hover:bg-emerald-100/80 data-[state=open]:bg-emerald-100/80' : ''}
                                            \`}>
                                                <SelectValue placeholder="Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {AVAILABLE_ROLES.map((role) => (
                                                    <SelectItem key={role} value={role} className="text-xs">
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>

                                    {/* Dates Columns */}`
);

content = content.replace(
`                                                <DropdownMenuSeparator />

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
                                                </DropdownMenuItem>`,
`                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                                    Revoke Access (Manual)
                                                </DropdownMenuItem>`
);

fs.writeFileSync(path, content);
console.log("Updated file.");
