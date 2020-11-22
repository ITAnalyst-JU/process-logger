use Term::ANSIColor;
print color('bold blue');
print "This text is bold blue.\n";
print color('reset');
print "This text is normal.\n";
print colored("Yellow on magenta.", 'yellow on_magenta'), "\n";
print "This text is normal.\n";
print colored(['yellow on_magenta'], 'Yellow on magenta.', "\n");
print colored(['red on_bright_yellow'], 'Red on bright yellow.', "\n");
print colored(['bright_red on_black'], 'Bright red on black.', "\n");
print "\n";

# Map escape sequences back to color names.
use Term::ANSIColor 1.04 qw(uncolor);
my @names = uncolor('01;31');
print join(q{ }, @names), "\n";

# Strip all color escape sequences.
use Term::ANSIColor 2.01 qw(colorstrip);
print colorstrip("\e[1mThis is bold\e[0m"), "\n";

# Determine whether a color is valid.
use Term::ANSIColor 2.02 qw(colorvalid);
my $valid = colorvalid('blue bold', 'on_magenta');
print "Color string is ", $valid ? "valid\n" : "invalid\n";

# Create new aliases for colors.
use Term::ANSIColor 4.00 qw(coloralias);
coloralias('alert', 'red');
print "Alert is ", coloralias('alert'), "\n";
print colored("This is in red.", 'alert'), "\n";

use Term::ANSIColor qw(:constants);
print BOLD, BLUE, "This text is in bold blue.\n", RESET;

use Term::ANSIColor qw(:constants);
{
    local $Term::ANSIColor::AUTORESET = 1;
    print BOLD BLUE "This text is in bold blue.\n";
    print "This text is normal.\n";
}

use Term::ANSIColor 2.00 qw(:pushpop);
print PUSHCOLOR RED ON_GREEN "This text is red on green.\n";
print PUSHCOLOR BRIGHT_BLUE "This text is bright blue on green.\n";
print RESET BRIGHT_BLUE "This text is just bright blue.\n";
print POPCOLOR "Back to red on green.\n";
print LOCALCOLOR GREEN ON_BLUE "This text is green on blue.\n";
print "This text is red on green.\n";
{
    local $Term::ANSIColor::AUTOLOCAL = 1;
    print ON_BLUE "This text is red on blue.\n";
    print "This text is red on green.\n";
}
print POPCOLOR "Back to whatever we started as.\n";

