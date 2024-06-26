const Reminder = require('../models/Reminder');

module.exports = async (client, list) => {
    try {
        const reminders = await Reminder.find({ listId: list._id });
        if (reminders.length > 0) {
            // Group the reminders by category
            const groupedReminders = reminders.reduce((acc, reminder) => {
                if (!acc[reminder.category]) {
                    acc[reminder.category] = [];
                }
                acc[reminder.category].push(reminder);
                return acc;
            }, {});
        
            // Sort the categories by earliest deadline
            for (const category in groupedReminders) {
                groupedReminders[category].sort((a, b) => a.deadline - b.deadline);
            }
        
            // Sort the reminders in each category by deadline, then by name
            for (const category in groupedReminders) {
                groupedReminders[category].sort((a, b) => {
                    if (a.deadline - b.deadline === 0) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.deadline - b.deadline;
                });
            }

            // Create a message to display the reminders
            // Format: Name - Description (if available), due/on (due if task, on if event) Deadline (if available), Time (if available)
            const today = new Date();
            let message = `DATE: **${today.getUTCMonth() + 1}/${today.getUTCDate()}**\n\n`;
            for (const category in groupedReminders) {
                message += `[${category}]\n`;
                for (const reminder of groupedReminders[category]) {
                    message += `• **${reminder.name}** - `;
                    if (reminder.description) {
                        message += `${reminder.description}, `;
                    }
                    if (reminder.deadline) {
                        message += `${reminder.type === 'task' ? 'due' : 'on'} `;
                        // Get the date components in UTC
                        const deadline = new Date(reminder.deadline);
                        deadline.setHours(deadline.getHours() + list.timezone);
                        const [year, month, day] = [deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, deadline.getUTCDate()];
                        // If the deadline is today, display "today"
                        if (day === today.getUTCDate() && month === today.getUTCMonth() + 1 && year === today.getUTCFullYear()) {
                            message += `today`;
                        } else if (day === today.getUTCDate() + 1 && month === today.getUTCMonth() + 1 && year === today.getUTCFullYear()){
                            message += `tomorrow`;
                        } else {
                            message += `${month}/${day}`;
                            // If the year is not the current year, display the year
                            if (year !== today.getUTCFullYear()) {
                                message += `/${year}`;
                            }
                        }
                        // Display time 
                        let timeOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
                        // If time is not 23:59:59, display the time
                        if (deadline.getUTCHours() !== 23 || deadline.getUTCMinutes() !== 59 || deadline.getUTCSeconds() !== 59) {
                            message += `, ${deadline.toLocaleTimeString('en-US', timeOptions)}`;
                        }
                    }
                    message += `\n`;
                }
                message += `\n`;
            }

            // Send a message to the channel where the list is registered
            if (list.guildId) {
                const channel = await client.channels.fetch(list.channelId);
                channel.send(message);
            } else {
                const user = await client.users.fetch(list.userId);
                user.send(message);
            }
        }
    } catch (e) {
        console.error(e);
    }   
}