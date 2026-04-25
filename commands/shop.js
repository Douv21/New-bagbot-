const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Gérer la boutique du serveur')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajouter un article à la boutique')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Nom de l\'article')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description de l\'article')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('price')
                        .setDescription('Prix de l\'article')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type d\'article')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Rôle', value: 'role' },
                            { name: 'Item virtuel', value: 'virtual' },
                            { name: 'Service', value: 'service' }
                        )
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Rôle à donner (si type = rôle)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Supprimer un article de la boutique')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID de l\'article')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Voir tous les articles de la boutique')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Acheter un article')
                .addStringOption(option =>
                    option
                        .setName('id')
                        .setDescription('ID de l\'article')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Voir votre solde')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                await addShopItem(interaction);
                break;
            case 'remove':
                await removeShopItem(interaction);
                break;
            case 'list':
                await listShopItems(interaction);
                break;
            case 'buy':
                await buyShopItem(interaction);
                break;
            case 'balance':
                await showBalance(interaction);
                break;
        }
    }
};

async function addShopItem(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de gérer la boutique.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description');
    const price = interaction.options.getInteger('price');
    const type = interaction.options.getString('type');
    const role = interaction.options.getRole('role');

    const item = {
        name,
        description,
        price,
        type,
        roleId: role?.id,
        guildId: interaction.guild.id
    };

    await database.addShopItem(interaction.guild.id, item);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🛒 Article ajouté')
        .setDescription('L\'article a été ajouté à la boutique avec succès !')
        .addFields(
            { name: 'Nom', value: name, inline: true },
            { name: 'Prix', value: `${price}€`, inline: true },
            { name: 'Type', value: type, inline: true },
            { name: 'Description', value: description, inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function removeShopItem(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Permission refusée')
            .setDescription('Vous n\'avez pas la permission de gérer la boutique.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const itemId = interaction.options.getString('id');

    await database.removeShopItem(interaction.guild.id, itemId);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🗑️ Article supprimé')
        .setDescription('L\'article a été supprimé de la boutique.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function listShopItems(interaction) {
    const items = await database.getShopItems(interaction.guild.id);
    const user = await database.getUser(interaction.user.id);

    if (items.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('🛍️ Boutique')
            .setDescription('La boutique est vide pour le moment.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🛍️ Boutique du serveur')
        .setDescription('Voici les articles disponibles dans la boutique:')
        .setFooter({ text: `Votre solde: ${user?.balance || 0}€` })
        .setTimestamp();

    items.forEach((item, index) => {
        embed.addFields({
            name: `${index + 1}. ${item.name} - ${item.price}€`,
            value: `**Type:** ${item.type}\n**Description:** ${item.description}\n**ID:** \`${item.id}\``,
            inline: false
        });
    });

    await interaction.reply({ embeds: [embed] });
}

async function buyShopItem(interaction) {
    const itemId = interaction.options.getString('id');
    const items = await database.getShopItems(interaction.guild.id);
    const user = await database.getUser(interaction.user.id);

    const item = items.find(i => i.id === itemId);

    if (!item) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Article introuvable')
            .setDescription('Cet article n\'existe pas dans la boutique.')
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const userBalance = user?.balance || 0;

    if (userBalance < item.price) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Solde insuffisant')
            .setDescription(`Vous n'avez pas assez d'argent pour acheter cet article. Il vous manque ${item.price - userBalance}€.`)
            .addFields(
                { name: 'Votre solde', value: `${userBalance}€`, inline: true },
                { name: 'Prix de l\'article', value: `${item.price}€`, inline: true }
            )
            .setTimestamp();
        
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Déduire l'argent
    await database.setUser(interaction.user.id, {
        balance: userBalance - item.price
    });

    // Donner l'article
    await giveItem(interaction, item);

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('🎉 Achat réussi !')
        .setDescription(`Vous avez acheté **${item.name}** pour ${item.price}€ !`)
        .addFields(
            { name: 'Article', value: item.name, inline: true },
            { name: 'Prix', value: `${item.price}€`, inline: true },
            { name: 'Nouveau solde', value: `${userBalance - item.price}€`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function giveItem(interaction, item) {
    switch (item.type) {
        case 'role':
            if (item.roleId) {
                const role = interaction.guild.roles.cache.get(item.roleId);
                if (role) {
                    await interaction.member.roles.add(role);
                }
            }
            break;
        case 'virtual':
            // Logique pour les items virtuels
            await database.setUser(interaction.user.id, {
                inventory: [...(await database.getUser(interaction.user.id))?.inventory || [], item.id]
            });
            break;
        case 'service':
            // Logique pour les services
            break;
    }
}

async function showBalance(interaction) {
    const user = await database.getUser(interaction.user.id);
    const balance = user?.balance || 0;

    const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('💰 Votre solde')
        .setDescription(`Votre solde actuel est de **${balance}€**`)
        .addFields(
            { name: '💸 Dépenses totales', value: `${user?.totalSpent || 0}€`, inline: true },
            { name: '🛍️ Articles achetés', value: `${user?.purchases || 0}`, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
